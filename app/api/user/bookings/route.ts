import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';

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
      return new NextResponse(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await query(`
      SELECT 
        b.id,
        b.status,
        b.start_date,
        b.end_date,
        b.total_price,
        b.payment_status,
        b.created_at,
        b.updated_at,
        v.id as vehicle_id,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.location as vehicle_location,
        v.images as vehicle_images,
        v.price_per_hour as vehicle_price_per_hour
      FROM bookings b 
      JOIN vehicles v ON b.vehicle_id = v.id 
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `, [session.user.id]);

    // Transform the data to match the Booking interface
    const bookings = result.rows.map(row => ({
      id: row.id,
      status: row.status,
      start_date: row.start_date,
      end_date: row.end_date,
      total_price: row.total_price,
      payment_status: row.payment_status,
      created_at: row.created_at,
      updated_at: row.updated_at,
      vehicle: {
        id: row.vehicle_id,
        name: row.vehicle_name,
        type: row.vehicle_type,
        location: row.vehicle_location,
        images: row.vehicle_images,
        price_per_hour: row.vehicle_price_per_hour
      }
    }));

    return new NextResponse(JSON.stringify({ 
      success: true,
      data: bookings 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    logger.error('Error fetching user bookings:', error);
    return new NextResponse(JSON.stringify({ 
      success: false,
      error: 'Failed to fetch bookings' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
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
    // Enhanced error logging
    logger.error('Error creating booking:', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : error,
      timestamp: new Date().toISOString()
    });

    return new NextResponse(JSON.stringify({ 
      error: 'Failed to create booking',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 