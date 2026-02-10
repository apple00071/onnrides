import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(
  request: Request,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const result = await query(`
      SELECT 
        b.id,
        b.booking_id,
        b.status,
        b.payment_status,
        b.payment_details,
        b.total_price,
        u.name as user_name,
        u.email as user_email,
        v.name as vehicle_name
      FROM bookings b
      JOIN users u ON b.user_id = u.id
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.id = $1 AND b.user_id = $2
    `, [params.bookingId, session.user.id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: booking.id,
        booking_id: booking.booking_id,
        status: booking.status,
        payment_status: booking.payment_status,
        payment_details: booking.payment_details,
        total_price: booking.total_price,
        user_name: booking.user_name,
        user_email: booking.user_email,
        vehicle_name: booking.vehicle_name
      }
    });
  } catch (error) {
    logger.error('Error fetching payment status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payment status' },
      { status: 500 }
    );
  }
} 