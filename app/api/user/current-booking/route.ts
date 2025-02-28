import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

// Add export config to handle dynamic usage
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Helper function to format location
function formatLocation(location: string | string[] | null): string {
  if (!location) return '';
  try {
    if (typeof location === 'string') {
      // Try to parse if it's a JSON string
      const parsed = JSON.parse(location);
      return Array.isArray(parsed) ? parsed[0] : location;
    }
    return Array.isArray(location) ? location[0] : location;
  } catch {
    return typeof location === 'string' ? location : '';
  }
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

    // Get the user's current booking with vehicle information
    // Ensure proper timezone handling for dates
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
          b.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as created_at,
          ROW_NUMBER() OVER (ORDER BY b.start_date ASC) as rn
        FROM bookings b
        WHERE b.user_id = $1 
          AND b.status NOT IN ('completed', 'cancelled')
          AND b.end_date > CURRENT_TIMESTAMP AT TIME ZONE 'UTC'
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
      pickup_location: formatLocation(booking.vehicle_location),
      drop_location: formatLocation(booking.dropoff_location) || formatLocation(booking.vehicle_location),
      total_amount: parseFloat(booking.total_price || 0),
      status: booking.status,
      payment_status: booking.payment_status || 'pending',
      created_at: booking.created_at
    };

    logger.info('Current booking fetched successfully', {
      bookingId: booking.id,
      status: booking.status,
      paymentStatus: booking.payment_status,
      pickupTime: booking.pickup_datetime,
      dropoffTime: booking.dropoff_datetime
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