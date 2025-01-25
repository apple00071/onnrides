import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import Razorpay from 'razorpay';
import logger from '@/lib/logger';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { bookingId, amount } = await request.json();

    // Verify booking belongs to user
    const booking = await db.query.bookings.findFirst({
      where: (bookings, { eq, and }) => 
        and(
          eq(bookings.id, bookingId),
          eq(bookings.user_id, session.user.id)
        ),
    });

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      receipt: bookingId,
    });

    // Update booking with order ID
    await db
      .update(bookings)
      .set({
        payment_order_id: order.id,
        updated_at: new Date(),
      })
      .where(eq(bookings.id, bookingId));

    return NextResponse.json({ orderId: order.id });
  } catch (error) {
    logger.error('Error creating payment order:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
} 