import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { toISTSql } from '@/lib/utils/sql-helpers';

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
        b.booking_id,
        b.user_id,
        b.vehicle_id,
        
        -- Store original UTC dates
        b.start_date,
        b.end_date,
        
        -- Use standardized IST conversion
        ${toISTSql('b.start_date')} as ist_start_date,
        ${toISTSql('b.end_date')} as ist_end_date,
        
        -- Formatted dates for display
        TO_CHAR(${toISTSql('b.start_date')}, 'DD Mon YYYY, FMHH12:MI AM') as formatted_pickup,
        TO_CHAR(${toISTSql('b.end_date')}, 'DD Mon YYYY, FMHH12:MI AM') as formatted_dropoff,
        
        EXTRACT(EPOCH FROM (b.end_date - b.start_date))/3600 as total_hours,
        b.total_price,
        b.status,
        b.payment_status,
        
        -- Convert timestamps to IST
        ${toISTSql('b.created_at')} as ist_created_at,
        ${toISTSql('b.updated_at')} as ist_updated_at,
        
        v.location as pickup_location,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        v.name as vehicle_name
      FROM bookings b
      LEFT JOIN users u ON u.id = b.user_id
      LEFT JOIN vehicles v ON v.id = b.vehicle_id
      WHERE b.user_id = $1::uuid
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
        
        // Use IST dates for display
        pickup_datetime: booking.ist_start_date || booking.start_date,
        dropoff_datetime: booking.ist_end_date || booking.end_date,
        formatted_pickup: booking.formatted_pickup,
        formatted_dropoff: booking.formatted_dropoff,
        
        total_hours: booking.total_hours,
        total_price: booking.total_price,
        status: booking.status,
        created_at: booking.ist_created_at || booking.created_at,
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