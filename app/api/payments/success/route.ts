import { NextRequest } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { bookings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

interface BookingRow {
  id: string;
  [key: string]: any;
}

// POST /api/payments/success - Handle successful payment
export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();
    if (!bookingId) {
      return new Response(JSON.stringify({ message: 'Booking ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get booking
    const booking = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1)
      .then((rows: BookingRow[]) => rows[0]);

    if (!booking) {
      logger.error('Booking not found:', { bookingId });
      return new Response(JSON.stringify({ message: 'Booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update booking status
    await db
      .update(bookings)
      .set({
        payment_status: 'completed',
        status: 'confirmed',
        updated_at: new Date()
      })
      .where(eq(bookings.id, bookingId));

    return new Response(JSON.stringify({
      message: 'Payment confirmed successfully',
      booking: {
        id: booking.id,
        payment_status: 'completed',
        status: 'confirmed'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Payment confirmation error:', error);
    return new Response(JSON.stringify({ message: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 