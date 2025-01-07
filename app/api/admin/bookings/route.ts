import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          b.id,
          b.pickup_datetime,
          b.dropoff_datetime,
          b.pickup_location,
          b.drop_location,
          b.total_amount,
          b.status,
          COALESCE(b.payment_status, 'pending') as payment_status,
          b.created_at,
          u.email as user_email,
          CONCAT(p.first_name, ' ', COALESCE(p.last_name, '')) as user_name,
          v.name as vehicle_name,
          v.type as vehicle_type
        FROM bookings b
        LEFT JOIN users u ON b.user_id = u.id
        LEFT JOIN profiles p ON u.id = p.user_id
        LEFT JOIN vehicles v ON b.vehicle_id = v.id
        ORDER BY b.created_at DESC
      `);

      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Booking ID and status are required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE bookings
        SET status = $1
        WHERE id = $2
        RETURNING *
      `, [status, id]);

      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: 'Booking not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Failed to update booking' },
      { status: 500 }
    );
  }
} 