import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { createOrder } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = await request.json();
    if (!bookingId) {
      return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
    }

    // Get booking details
    const bookingResult = await query(
      'SELECT * FROM bookings WHERE id = $1 LIMIT 1',
      [bookingId]
    );

    const booking = bookingResult.rows[0];
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create Razorpay order
    const razorpayOrder = await createOrder({
      amount: Math.round(Number(booking.total_price) * 100), // Convert to paise and ensure it's an integer
      currency: 'INR',
      receipt: bookingId,
      notes: {
        booking_id: bookingId,
        user_id: session.user.id
      }
    });

    // Update booking with order details
    await query(
      `UPDATE bookings 
       SET payment_details = $1, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [
        JSON.stringify({
          order_id: razorpayOrder.id,
          amount: razorpayOrder.amount,
          currency: razorpayOrder.currency,
          status: razorpayOrder.status,
          created_at: new Date().toISOString()
        }),
        bookingId
      ]
    );

    return NextResponse.json({
      id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    });

  } catch (error) {
    logger.error('Error creating order:', error);
    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
} 