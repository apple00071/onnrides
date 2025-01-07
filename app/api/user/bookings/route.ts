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
        v.location as vehicle_location,
        v.price_per_day as vehicle_price
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
          location: booking.vehicle_location,
          price_per_day: parseFloat(booking.vehicle_price)
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