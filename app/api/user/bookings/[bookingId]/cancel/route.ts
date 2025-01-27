import { NextRequest } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    // Verify authentication
    const user = await getCurrentUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get booking
    const { rows: [booking] } = await query(
      `SELECT * FROM bookings WHERE id = $1 LIMIT 1`,
      [params.bookingId]
    );

    if (!booking) {
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user is authorized to cancel this booking
    if (booking.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if booking is in a cancellable state
    if (booking.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Only pending bookings can be cancelled' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the booking status to cancelled
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        status: 'cancelled',
        updated_at: new Date()
      })
      .where(eq(bookings.id, params.bookingId))
      .returning();

    // Update the vehicle availability
    await db
      .update(vehicles)
      .set({ is_available: true })
      .where(eq(vehicles.id, booking.vehicle_id));

    return new Response(JSON.stringify(updatedBooking), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error cancelling booking:', error);
    return new Response(JSON.stringify({ error: 'Failed to cancel booking' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 