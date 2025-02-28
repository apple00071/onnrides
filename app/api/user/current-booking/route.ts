import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

// Add export config to handle dynamic usage
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
    // Optimize the query to reduce data fetched and improve performance
    const result = await query(`
      WITH current_booking AS (
        SELECT 
          b.id,
          b.booking_id,
          b.vehicle_id,
          b.status,
          b.payment_status,
          b.total_price,
          b.start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as pickup_datetime,
          b.end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as dropoff_datetime,
          b.dropoff_location,
          ROW_NUMBER() OVER (ORDER BY b.start_date ASC) as rn
        FROM bookings b
        WHERE b.user_id = $1 
          AND b.status NOT IN ('completed', 'cancelled')
          AND b.end_date > CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata'
      )
      SELECT 
        cb.*,
        v.name as vehicle_name,
        v.location as vehicle_location
      FROM current_booking cb
      LEFT JOIN vehicles v ON cb.vehicle_id = v.id
      WHERE cb.rn = 1
    `, [session.user.id]);

    if (result.rows.length === 0) {
      logger.info('No current booking found for user', { userId: session.user.id });
      return NextResponse.json({ booking: null });
    }

    const booking = result.rows[0];

    // Format the response with only necessary fields
    const formattedBooking = {
      id: booking.id,
      booking_id: booking.booking_id,
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
      paymentStatus: booking.payment_status
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