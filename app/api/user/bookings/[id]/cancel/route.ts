import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.id;
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // First check if the booking belongs to the user and is in a cancellable state
      const bookingResult = await client.query(`
        SELECT status
        FROM bookings
        WHERE id = $1 AND user_id = $2
      `, [bookingId, user.id]);

      if (bookingResult.rowCount === 0) {
        return NextResponse.json(
          { error: 'Booking not found or unauthorized' },
          { status: 404 }
        );
      }

      const booking = bookingResult.rows[0];
      if (booking.status !== 'pending') {
        return NextResponse.json(
          { error: 'Only pending bookings can be cancelled' },
          { status: 400 }
        );
      }

      // Update the booking status to cancelled
      const result = await client.query(`
        UPDATE bookings
        SET status = 'cancelled'
        WHERE id = $1 AND user_id = $2
        RETURNING *
      `, [bookingId, user.id]);

      // Update the vehicle availability
      await client.query(`
        UPDATE vehicles v
        SET is_available = true
        FROM bookings b
        WHERE b.id = $1 AND b.vehicle_id = v.id
      `, [bookingId]);

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
} 