import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createOrder } from '../../../../lib/razorpay';
import { db } from '@/lib/db';
import { bookings } from '@/lib/schema';
import logger from '@/lib/logger';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const session = await verifyAuth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = await request.json();
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Get booking details
    const [booking] = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create Razorpay order
    const order = await createOrder({
      amount: Number(booking.total_price),
      notes: {
        bookingId: booking.id,
        userId: session.user.id,
        vehicleId: booking.vehicle_id,
      },
    });

    // Update booking with order ID
    await db
      .update(bookings)
      .set({
        payment_intent_id: order.id,
        updated_at: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    logger.error('Error creating payment order:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
} 