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
    logger.info('Received create order request');
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logger.warn('Authentication missing');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    logger.info('User authenticated:', { userId: session.user.id });

    const { bookingId, amount } = await request.json();
    logger.info('Request data:', { bookingId, amount });

    if (!bookingId || !amount) {
      logger.warn('Missing required fields');
      return NextResponse.json(
        { error: 'Booking ID and amount are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      logger.warn('Invalid amount:', amount);
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Verify booking belongs to user
    const booking = await db.query.bookings.findFirst({
      where: (bookings, { eq, and }) => 
        and(
          eq(bookings.id, bookingId),
          eq(bookings.user_id, session.user.id)
        ),
    });

    if (!booking) {
      logger.warn('Booking not found or unauthorized:', { bookingId });
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    logger.info('Found booking:', { bookingId });

    // Create Razorpay order
    const amountInPaise = Math.round(amount * 100);
    logger.info('Creating Razorpay order:', { 
      amount: amountInPaise,
      currency: 'INR',
      receipt: bookingId 
    });

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt: bookingId,
    });
    logger.info('Razorpay order created:', { orderId: order.id });

    // Update booking with order ID
    await db
      .update(bookings)
      .set({
        payment_order_id: order.id,
        updated_at: new Date(),
      })
      .where(eq(bookings.id, bookingId));
    logger.info('Booking updated with order ID');

    const response = { 
      orderId: order.id,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount // Amount in paise
    };
    logger.info('Sending response:', { ...response, key: '***' });

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Error creating payment order:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment order' },
      { status: 500 }
    );
  }
} 