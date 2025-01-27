import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { nanoid } from 'nanoid';

interface BookingBody {
  vehicle_id: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  total_hours: number;
  total_price: number;
}

// GET /api/bookings - List user's bookings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      'SELECT * FROM bookings WHERE user_id = $1 ORDER BY created_at DESC',
      [session.user.id]
    );
    
    return NextResponse.json(result.rows);
  } catch (error) {
    logger.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
  }
}

// POST /api/bookings - Create booking
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json() as BookingBody;
    logger.info('Received booking request:', body);

    // Validate required fields
    if (!body.vehicle_id || !body.pickup_datetime || !body.dropoff_datetime || !body.total_hours || !body.total_price) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if vehicle is available for the requested time period
    const conflictingBookings = await query(
      `SELECT COUNT(*) as count 
       FROM bookings 
       WHERE vehicle_id = $1 
       AND status = 'active'
       AND ($2::timestamp, $3::timestamp) OVERLAPS (start_date, end_date)`,
      [body.vehicle_id, body.pickup_datetime, body.dropoff_datetime]
    );

    if (conflictingBookings.rows[0].count > 0) {
      return NextResponse.json(
        { error: 'Vehicle is not available for the selected time period' },
        { status: 400 }
      );
    }

    // Create booking
    const bookingId = nanoid();
    const result = await query(
      `INSERT INTO bookings (
        id, user_id, vehicle_id, start_date, end_date,
        total_hours, total_price, status, payment_status,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *`,
      [
        bookingId,
        session.user.id,
        body.vehicle_id,
        body.pickup_datetime,
        body.dropoff_datetime,
        body.total_hours,
        body.total_price,
        'pending',
        'pending'
      ]
    );

    const booking = result.rows[0];
    return NextResponse.json({ booking });
  } catch (error) {
    logger.error('Error creating booking:', error);
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 });
  }
} 