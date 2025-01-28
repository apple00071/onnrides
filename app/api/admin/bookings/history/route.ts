import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return new NextResponse(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400 }
      );
    }

    // First get the user name
    const userResult = await query(
      'SELECT name FROM users WHERE id = $1',
      [userId]
    );

    const userName = userResult.rows[0]?.name || 'Unknown User';

    // Then get their booking history
    const result = await query(`
      SELECT 
        b.*,
        v.name as vehicle_name,
        v.type as vehicle_type
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
    `, [userId]);

    const bookings = result.rows.map(booking => ({
      id: booking.id,
      start_date: booking.start_date,
      end_date: booking.end_date,
      total_hours: booking.total_hours,
      total_price: booking.total_price,
      status: booking.status,
      payment_status: booking.payment_status,
      vehicle: {
        name: booking.vehicle_name,
        type: booking.vehicle_type
      }
    }));

    return new NextResponse(
      JSON.stringify({ bookings, userName }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching booking history:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    );
  }
} 