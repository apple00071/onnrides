import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Mark route as dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    const sqlQuery = `
      SELECT 
        b.id,
        COALESCE(b.booking_id, 'OR' || SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 3)) as booking_id,
        b.user_id,
        b.vehicle_id,
        b.start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as start_date,
        b.end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as end_date,
        EXTRACT(EPOCH FROM (b.end_date - b.start_date))/3600 as total_hours,
        b.total_price,
        b.status,
        b.payment_status,
        b.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as created_at,
        b.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as updated_at,
        v.location as pickup_location,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        v.name as vehicle_name
      FROM bookings b
      LEFT JOIN users u ON u.id = b.user_id
      LEFT JOIN vehicles v ON v.id = b.vehicle_id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `;

    const result = await query(sqlQuery, [userId]);

    // Log the first row for debugging
    if (result.rows.length > 0) {
      logger.info('First row data:', { 
        firstRow: JSON.stringify(result.rows[0], null, 2)
      });
    }

    const bookings = result.rows.map(booking => {
      return {
        id: booking.id,
        booking_id: booking.booking_id,
        user_id: booking.user_id,
        vehicle_id: booking.vehicle_id,
        pickup_datetime: booking.start_date,
        dropoff_datetime: booking.end_date,
        total_hours: booking.total_hours,
        total_price: booking.total_price,
        status: booking.status,
        created_at: booking.created_at,
        location: booking.pickup_location,
        user: {
          name: booking.user_name,
          email: booking.user_email,
          phone: booking.user_phone
        },
        vehicle: {
          name: booking.vehicle_name
        }
      };
    });

    return NextResponse.json({
      success: true,
      bookings
    });

  } catch (error) {
    logger.error('Error fetching booking history:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch booking history'
      },
      { status: 500 }
    );
  }
} 