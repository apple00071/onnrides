import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';
import { sendBookingNotification } from '@/lib/whatsapp/integration';

interface BookingBody {
  vehicle_id: string;
  start_date: string;
  end_date: string;
  duration: number;
  total_price: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get URL parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) 
      FROM bookings 
      WHERE user_id = $1
    `, [session.user.id]);

    const totalBookings = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalBookings / limit);

    // Get the user's booking history with vehicle information
    const result = await query(`
      SELECT 
        b.*,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.location as vehicle_location,
        b.start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as pickup_datetime,
        b.end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as dropoff_datetime,
        b.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as created_at,
        b.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as updated_at
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `, [session.user.id, limit, offset]);

    // Format the bookings
    const bookings = result.rows.map(booking => ({
      id: booking.id,
      booking_id: booking.booking_id,
      vehicle_name: booking.vehicle_name,
      pickup_datetime: booking.pickup_datetime,
      dropoff_datetime: booking.dropoff_datetime,
      pickup_location: booking.vehicle_location,
      drop_location: booking.dropoff_location || booking.vehicle_location,
      total_amount: parseFloat(booking.total_price || 0),
      status: booking.status,
      payment_status: booking.payment_status || 'pending',
      created_at: booking.created_at
    }));

    logger.info('Booking history fetched successfully', {
      userId: session.user.id,
      page,
      limit,
      totalBookings
    });

    return NextResponse.json({
      bookings,
      pagination: {
        total: totalBookings,
        page,
        limit,
        totalPages
      }
    });

  } catch (error) {
    logger.error('Error fetching booking history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch booking history' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch (e) {
      logger.error('Failed to parse request body:', e);
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid request body',
        details: e instanceof Error ? e.message : 'Failed to parse JSON'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    logger.info('Received booking data:', {
      ...body,
      session_user_id: session.user.id
    });
    
    const { vehicle_id, start_date, end_date, duration, total_price } = body as BookingBody;

    // Validate required fields
    if (!vehicle_id || !start_date || !end_date || !duration || !total_price) {
      const missingFields = {
        vehicle_id: !vehicle_id,
        start_date: !start_date,
        end_date: !end_date,
        duration: !duration,
        total_price: !total_price
      };
      
      logger.error('Missing required fields:', missingFields);
      return new NextResponse(JSON.stringify({ 
        error: 'Missing required fields',
        details: missingFields
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate date formats
    try {
      new Date(start_date);
      new Date(end_date);
    } catch (e) {
      logger.error('Invalid date format:', { start_date, end_date });
      return new NextResponse(JSON.stringify({ 
        error: 'Invalid date format',
        details: { start_date, end_date }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Log the values we're about to insert
    const bookingId = randomUUID();
    const insertValues = [
      bookingId,
      session.user.id,
      vehicle_id,
      new Date(start_date),
      new Date(end_date),
      total_price,
      duration,
      'pending',
      'pending'
    ];

    logger.info('Attempting to create booking with values:', {
      bookingId,
      userId: session.user.id,
      vehicleId: vehicle_id,
      startDate: start_date,
      endDate: end_date,
      total_price,
      total_hours: duration,
      insertValues
    });

    // Get vehicle details for the notification
    const vehicleResult = await query(
      'SELECT name FROM vehicles WHERE id = $1',
      [vehicle_id]
    );

    const vehicleName = vehicleResult.rows[0]?.name || 'Vehicle';

    // Create booking
    try {
      const result = await query(`
        INSERT INTO bookings (
          id,
          user_id,
          vehicle_id,
          start_date,
          end_date,
          total_price,
          total_hours,
          status,
          payment_status,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `, insertValues);

      // Check if booking was created
      if (!result.rows || result.rows.length === 0) {
        logger.error('No booking was created', {
          bookingId,
          userId: session.user.id,
          vehicleId: vehicle_id,
          insertValues
        });
        throw new Error('Failed to create booking - no rows returned');
      }

      const booking = result.rows[0];

      // Send WhatsApp notification
      await sendBookingNotification(session.user, {
        vehicleName,
        startDate: start_date,
        endDate: end_date,
        bookingId: booking.id,
        status: 'pending',
        totalPrice: total_price.toString()
      });

      logger.info('Created booking:', { 
        bookingId: booking.id,
        userId: session.user.id,
        vehicleId: vehicle_id,
        total_price: total_price
      });

      return new NextResponse(JSON.stringify({
        success: true,
        data: {
          booking
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (dbError) {
      logger.error('Database error:', {
        error: dbError,
        query: 'INSERT INTO bookings...',
        values: insertValues
      });
      throw dbError;
    }
  } catch (error) {
    logger.error('Error in POST /api/user/bookings:', error);
    return new NextResponse(JSON.stringify({ 
      error: 'Failed to create booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 