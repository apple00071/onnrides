import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { bookings } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';

// POST /api/payments/success - Handle successful payment
export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();
    if (!bookingId) {
      return NextResponse.json(
        { message: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Get booking
    const booking = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1)
      .execute()
      .then(rows => rows[0]);

    if (!booking) {
      logger.error('Booking not found:', { bookingId });
      return NextResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update booking status
    await db
      .update(bookings)
      .set({
        payment_status: 'paid',
        status: 'confirmed',
        updated_at: sql`strftime('%s', 'now')`
      })
      .where(eq(bookings.id, bookingId))
      .execute();

    return NextResponse.json({
      message: 'Payment confirmed successfully',
      booking: {
        id: booking.id,
        payment_status: 'paid',
        status: 'confirmed'
      }
    });

  } catch (error) {
    logger.error('Payment confirmation error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 