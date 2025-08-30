import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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
        b.start_date,
        b.end_date,
        b.status,
        b.payment_status,
        b.total_price,
        u.name as user_name,
        u.email as user_email,
        v.name as vehicle_name,
        v.type as vehicle_type
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

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error fetching booking details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch booking details' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const body = await request.json();
    const { status } = body;

    if (!status) {
      return NextResponse.json(
        { success: false, error: 'Status is required' },
        { status: 400 }
      );
    }

    // Check if booking exists and belongs to user
    const bookingResult = await query(`
      SELECT * FROM bookings 
      WHERE id = $1 AND user_id = $2
    `, [params.bookingId, session.user.id]);

    if (bookingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Only allow cancellation of pending bookings
    if (status === 'cancelled' && booking.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Only pending bookings can be cancelled' },
        { status: 400 }
      );
    }

    // Update booking status
    const result = await query(`
      UPDATE bookings 
      SET status = $1, updated_at = NOW() 
      WHERE id = $2 AND user_id = $3 
      RETURNING *
    `, [status, params.bookingId, session.user.id]);

    // If booking is cancelled, make vehicle available
    if (status === 'cancelled') {
      await query(`
        UPDATE vehicles 
        SET is_available = true, updated_at = NOW() 
        WHERE id = $1
      `, [booking.vehicle_id]);
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    logger.error('Error updating booking:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update booking' },
      { status: 500 }
    );
  }
} 