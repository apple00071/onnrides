import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import type { Database } from '@/lib/schema';
import { verifyAuth } from '@/app/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Check if user is authenticated
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const bookingId = params.bookingId;
    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // First check if the booking belongs to the user and is in a cancellable state
    const booking = await db
      .selectFrom('bookings')
      .selectAll()
      .where('id', '=', bookingId)
      .limit(1)
      .execute();

    if (!booking || booking.length === 0) {
      return NextResponse.json(
        { error: 'Booking not found or unauthorized' },
        { status: 404 }
      );
    }

    if (booking[0].status !== 'pending') {
      return NextResponse.json(
        { error: 'Only pending bookings can be cancelled' },
        { status: 400 }
      );
    }

    // Update the booking status to cancelled
    const [updatedBooking] = await db
      .updateTable('bookings')
      .set({ status: 'cancelled' })
      .where('id', '=', bookingId)
      .returningAll()
      .execute();

    // Update the vehicle availability
    await db
      .updateTable('vehicles')
      .set({ is_available: true })
      .where('id', '=', booking[0].vehicle_id)
      .execute();

    return NextResponse.json(updatedBooking);
  } catch (error) {
    logger.error('Error cancelling booking:', error);
    return NextResponse.json(
      { error: 'Failed to cancel booking' },
      { status: 500 }
    );
  }
} 