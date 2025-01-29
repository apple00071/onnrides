import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { nanoid } from 'nanoid';
import { Booking, ApiResponse } from '@/lib/types';

const isDevelopment = process.env.NODE_ENV === 'development';

type BookingBody = {
  vehicle_id: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  total_hours: number;
  total_price: number;
  location?: string;
};

// GET /api/bookings - List user's bookings
export async function GET(request: NextRequest): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const result = await query(
      'SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
      [session.user.id]
    );
    
    return Response.json({ 
      success: true,
      data: result.rows 
    });
  } catch (error) {
    if (isDevelopment) {
      logger.error('Error fetching bookings:', error);
    }
    return Response.json({ 
      success: false,
      error: 'Failed to fetch bookings' 
    }, { status: 500 });
  }
}

// POST /api/bookings - Create booking
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return Response.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const body = await request.json() as BookingBody;

    // Validate required fields
    if (!body.vehicle_id || !body.pickup_datetime || !body.dropoff_datetime || !body.total_hours || !body.total_price) {
      return Response.json({ 
        success: false,
        error: 'Missing required fields' 
      }, { status: 400 });
    }

    // Parse and validate dates
    const pickupDate = new Date(body.pickup_datetime);
    const dropoffDate = new Date(body.dropoff_datetime);

    if (isNaN(pickupDate.getTime()) || isNaN(dropoffDate.getTime())) {
      return Response.json({ 
        success: false,
        error: 'Invalid date format' 
      }, { status: 400 });
    }

    // Check if vehicle is available for the requested time period
    const conflictingBookings = await query(
      `SELECT COUNT(*) as count 
       FROM bookings 
       WHERE vehicle_id = $1 
       AND status = 'active'
       AND ($2::timestamptz, $3::timestamptz) OVERLAPS (start_date, end_date)`,
      [body.vehicle_id, pickupDate.toISOString(), dropoffDate.toISOString()]
    );

    if (conflictingBookings.rows[0].count > 0) {
      return Response.json({
        success: false,
        error: 'Vehicle is not available for the selected time period'
      }, { status: 400 });
    }

    // Create booking with correct column names and number of parameters
    const bookingId = nanoid();
    const insertQuery = `
      INSERT INTO bookings (
        id, user_id, vehicle_id, start_date, end_date,
        total_hours, total_price, status, payment_status,
        created_at, updated_at, pickup_location
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, $10)
      RETURNING *
    `;
    const insertParams = [
      bookingId,
      session.user.id,
      body.vehicle_id,
      pickupDate.toISOString(),
      dropoffDate.toISOString(),
      body.total_hours,
      body.total_price,
      'pending',
      'pending',
      body.location || null
    ];

    const result = await query(insertQuery, insertParams);

    if (!result.rows[0]) {
      throw new Error('Failed to create booking - no data returned');
    }

    // Transform the response to match the expected format
    const booking = {
      id: result.rows[0].id,
      user_id: result.rows[0].user_id,
      vehicle_id: result.rows[0].vehicle_id,
      pickup_datetime: result.rows[0].start_date,
      dropoff_datetime: result.rows[0].end_date,
      total_hours: result.rows[0].total_hours,
      total_price: result.rows[0].total_price,
      status: result.rows[0].status,
      created_at: result.rows[0].created_at,
      location: result.rows[0].pickup_location || '',
      user: {
        name: session.user.name || 'Unknown',
        email: session.user.email || '',
        phone: session.user.phone || ''
      },
      vehicle: {
        name: '' // This will be populated by the frontend
      }
    };

    return Response.json({ 
      success: true,
      data: { booking } 
    });
  } catch (error) {
    // Only log errors in development
    if (isDevelopment) {
      logger.error('Error creating booking:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }

    return Response.json({ 
      success: false,
      error: 'Failed to create booking',
      ...(isDevelopment && { details: String(error) })
    }, { status: 500 });
  }
} 