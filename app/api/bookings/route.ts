import logger from '@/lib/logger';

import pool from '@/lib/db';


export async function GET(request: NextRequest) {
  
  try {
    // Check if user is authenticated
    
    if (!currentUser) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    
    

    // Build the query
    let query = `
      SELECT 
        b.*,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.image_url as vehicle_image,
        v.location as vehicle_location
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.user_id = $1
    `;
    const params: unknown[] = [currentUser.id];

    if (status) {
      query += ' AND b.status = $2';
      params.push(status);
    }

    query += ' ORDER BY b.created_at DESC';

    

    return NextResponse.json({
      bookings: result.rows.map(booking => ({
        id: booking.id,
        vehicle_id: booking.vehicle_id,
        pickup_datetime: booking.pickup_datetime,
        dropoff_datetime: booking.dropoff_datetime,
        total_amount: parseFloat(booking.total_amount),
        status: booking.status,
        created_at: booking.created_at,
        vehicle: {
          name: booking.vehicle_name,
          type: booking.vehicle_type,
          image_url: booking.vehicle_image,
          location: booking.vehicle_location
        }
      }))
    });
  } catch (error) {
    logger.error('Failed to fetch bookings:', error);
    return NextResponse.json(
      { message: 'Failed to fetch bookings. Please try again.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  
  try {
    // Check if user is authenticated
    
    if (!currentUser) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const {
      vehicle_id,
      pickup_datetime,
      dropoff_datetime,
      total_amount
    } = await request.json();

    // Validate required fields
    if (!vehicle_id || !pickup_datetime || !dropoff_datetime || !total_amount) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Start transaction
    await client.query('BEGIN');

    // Check if vehicle is available for the selected dates
    

    if (parseInt(availabilityCheck.rows[0].booking_count) > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { message: 'Vehicle is not available for the selected dates' },
        { status: 400 }
      );
    }

    // Create booking
    

    await client.query('COMMIT');

    return NextResponse.json({
      booking: {
        id: result.rows[0].id,
        vehicle_id: result.rows[0].vehicle_id,
        pickup_datetime: result.rows[0].pickup_datetime,
        dropoff_datetime: result.rows[0].dropoff_datetime,
        total_amount: parseFloat(result.rows[0].total_amount),
        status: result.rows[0].status,
        created_at: result.rows[0].created_at
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to create booking:', error);
    return NextResponse.json(
      { message: 'Failed to create booking. Please try again.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 