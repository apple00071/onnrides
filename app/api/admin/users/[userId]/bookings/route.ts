import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const currentUser = await getCurrentUser(request.cookies);
    if (!currentUser || currentUser.role !== 'admin') {
      console.log('Unauthorized access attempt to user bookings');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = params;
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          b.id,
          b.start_date,
          b.end_date,
          b.total_amount,
          b.status,
          v.name as vehicle_name
        FROM bookings b
        JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.user_id = $1
        ORDER BY b.created_at DESC
      `, [userId]);

      // Transform the data to ensure all fields are properly typed
      const bookings = result.rows.map(booking => ({
        id: booking.id,
        start_date: booking.start_date,
        end_date: booking.end_date,
        total_amount: parseFloat(booking.total_amount),
        status: booking.status,
        vehicle_name: booking.vehicle_name
      }));

      console.log(`Successfully fetched ${bookings.length} bookings for user ${userId}`);
      return NextResponse.json(bookings);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user bookings' },
      { status: 500 }
    );
  }
} 