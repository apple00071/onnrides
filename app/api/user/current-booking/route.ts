import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { toISTSql } from '@/lib/utils/sql-helpers';
import { withTimezoneProcessing } from '@/middleware/timezone-middleware';

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

// Update the GET function to use our middleware
const getCurrentBookingHandler = async (request: NextRequest) => {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Get the user's current/upcoming booking with vehicle information
    const sqlQuery = `
      SELECT 
        b.id,
        b.vehicle_id,
        ${toISTSql('b.start_date')} as pickup_datetime,
        ${toISTSql('b.end_date')} as dropoff_datetime,
        b.total_hours,
        b.total_price,
        b.status,
        b.payment_status,
        ${toISTSql('b.created_at')} as created_at,
        b.booking_id,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.location as vehicle_location,
        v.image_url as vehicle_image,
        
        -- Formatted dates as strings
        TO_CHAR(${toISTSql('b.start_date')}, 'DD Mon YYYY, HH12:MI AM') as formatted_pickup,
        TO_CHAR(${toISTSql('b.end_date')}, 'DD Mon YYYY, HH12:MI AM') as formatted_dropoff
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.user_id = $1::uuid
      AND b.status = 'confirmed'
      AND b.end_date > NOW()
      ORDER BY b.start_date ASC
      LIMIT 1
    `;
    
    // Execute the query
    const result = await query(sqlQuery, [userId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
        message: 'No current bookings found'
      });
    }
    
    // Return the booking data
    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Failed to fetch current booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch current booking' },
      { status: 500 }
    );
  }
};

// Apply the timezone processing middleware
export const GET = withTimezoneProcessing(getCurrentBookingHandler); 