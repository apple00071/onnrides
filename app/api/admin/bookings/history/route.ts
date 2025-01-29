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

    let query_string = `
      SELECT 
        b.*,
        v.name as vehicle_name,
        u.name as user_name,
        u.email as user_email
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      LEFT JOIN users u ON b.user_id = u.id
    `;

    let params: any[] = [];

    if (userId) {
      query_string += ' WHERE b.user_id = $1';
      params.push(userId);
    }

    query_string += ' ORDER BY b.created_at DESC';

    const result = await query(query_string, params);

    const bookings = result.rows.map(booking => ({
      id: booking.id,
      user_id: booking.user_id,
      vehicle_id: booking.vehicle_id,
      pickup_datetime: booking.pickup_datetime,
      dropoff_datetime: booking.dropoff_datetime,
      total_hours: booking.total_hours,
      total_price: booking.total_price,
      status: booking.status,
      created_at: booking.created_at,
      user: {
        name: booking.user_name,
        email: booking.user_email
      },
      vehicle: {
        name: booking.vehicle_name
      }
    }));

    return NextResponse.json({
      success: true,
      bookings
    });

  } catch (error) {
    console.error('Error fetching booking history:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch booking history'
      },
      { status: 500 }
    );
  }
} 