import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { bookings } from '@/lib/schema';
import { verifyAuth } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';
import { razorpay } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

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
      return NextResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.user_id !== user.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Convert total_price to number and ensure it's valid
    const amount = Number(booking.total_price);
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: 'Invalid booking amount' },
        { status: 400 }
      );
    }

    logger.info('Creating payment order:', {
      bookingId,
      amount,
      userId: user.id
    });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // amount in paise
      currency: 'INR',
      receipt: bookingId,
      notes: {
        booking_id: bookingId,
        user_id: user.id
      }
    });

    // Update booking with order ID
    await db
      .update(bookings)
      .set({
        payment_id: order.id,
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(bookings.id, bookingId))
      .execute();

    logger.info('Payment order created:', {
      orderId: order.id,
      bookingId,
      amount: order.amount
    });

    return NextResponse.json({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      name: 'OnnRides',
      description: `Booking #${bookingId}`,
      order_id: order.id,
      prefill: {
        name: user.name || undefined,
        email: user.email || undefined,
      },
      theme: {
        color: '#f26e24'
      }
    });

  } catch (error) {
    logger.error('Payment error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 