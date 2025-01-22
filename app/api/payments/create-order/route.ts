import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { bookings } from '@/lib/schema';
import { verifyAuth } from '@/lib/auth';
import { eq, sql } from 'drizzle-orm';
import { createOrder } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
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
        { message: 'Forbidden' },
        { status: 403 }
      );
    }

    // Create Razorpay order
    const razorpayOrder = await createOrder({
      amount: Number(Number(booking.total_price).toFixed(2)),
      currency: 'INR',
      receipt: bookingId,
      notes: {
        booking_id: bookingId,
        user_id: user.id
      }
    });

    // Update booking with order details
    await db
      .update(bookings)
      .set({
        payment_details: JSON.stringify({
          order_id: razorpayOrder.id,
          amount: Number((razorpayOrder.amount / 100).toFixed(2)),
          currency: razorpayOrder.currency,
          status: razorpayOrder.status,
          created_at: new Date().toISOString()
        }),
        updated_at: sql`strftime('%s', 'now')`
      })
      .where(eq(bookings.id, bookingId))
      .execute();

    return NextResponse.json({
      message: 'Order created successfully',
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      }
    });

  } catch (error) {
    logger.error('Error creating order:', error);
    return NextResponse.json(
      { message: 'Failed to create order' },
      { status: 500 }
    );
  }
} 