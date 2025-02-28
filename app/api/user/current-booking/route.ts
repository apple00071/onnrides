import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the user's current booking with vehicle information
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
        AND b.status NOT IN ('completed', 'cancelled')
        AND b.end_date > CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'
      ORDER BY b.start_date ASC
      LIMIT 1
    `, [session.user.id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ booking: null });
    }

    const booking = result.rows[0];

    // Format the response
    const formattedBooking = {
      id: booking.id,
      vehicle_name: booking.vehicle_name,
      pickup_datetime: booking.pickup_datetime,
      dropoff_datetime: booking.dropoff_datetime,
      pickup_location: booking.vehicle_location,
      drop_location: booking.dropoff_location || booking.vehicle_location,
      total_amount: parseFloat(booking.total_price || 0),
      status: booking.status,
      payment_status: booking.payment_status || 'pending'
    };

    logger.info('Current booking fetched successfully', {
      bookingId: booking.id,
      status: booking.status,
      paymentStatus: booking.payment_status,
      pickupDatetime: booking.pickup_datetime,
      dropoffDatetime: booking.dropoff_datetime
    });

    return NextResponse.json({ booking: formattedBooking });

  } catch (error) {
    logger.error('Error fetching current booking:', error);
    return NextResponse.json(
      { error: 'Failed to fetch current booking' },
      { status: 500 }
    );
  }
} 