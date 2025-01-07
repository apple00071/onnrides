import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser(request.cookies);
    if (!currentUser) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

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
    const params: any[] = [currentUser.id];

    if (status) {
      query += ' AND b.status = $2';
      params.push(status);
    }

    query += ' ORDER BY b.created_at DESC';

    const result = await client.query(query, params);

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
    console.error('Failed to fetch bookings:', error);
    return NextResponse.json(
      { message: 'Failed to fetch bookings. Please try again.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  try {
    // Check if user is authenticated
    const currentUser = await getCurrentUser(request.cookies);
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
    const availabilityCheck = await client.query(`
      SELECT COUNT(*) as booking_count
      FROM bookings
      WHERE vehicle_id = $1
      AND status NOT IN ('cancelled', 'rejected')
      AND (pickup_datetime, dropoff_datetime) OVERLAPS ($2, $3)
    `, [vehicle_id, pickup_datetime, dropoff_datetime]);

    if (parseInt(availabilityCheck.rows[0].booking_count) > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { message: 'Vehicle is not available for the selected dates' },
        { status: 400 }
      );
    }

    // Create booking
    const result = await client.query(`
      INSERT INTO bookings (
        user_id,
        vehicle_id,
        pickup_datetime,
        dropoff_datetime,
        total_amount,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      currentUser.id,
      vehicle_id,
      pickup_datetime,
      dropoff_datetime,
      total_amount,
      'pending'
    ]);

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
    console.error('Failed to create booking:', error);
    return NextResponse.json(
      { message: 'Failed to create booking. Please try again.' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 