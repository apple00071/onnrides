import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRazorpayInstance } from '@/lib/razorpay';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
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
    const bookingResult = await query(
      `SELECT * FROM bookings WHERE id = $1 LIMIT 1`,
      [bookingId]
    );

    const booking = bookingResult.rows[0];

    if (!booking) {
      return NextResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }

    if (booking.user_id !== session.user.id) {
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
      userId: session.user.id
    });

    // Create Razorpay order
    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // amount in paise
      currency: 'INR',
      receipt: bookingId,
      notes: {
        booking_id: bookingId,
        user_id: session.user.id
      }
    });

    // Update booking with order ID
    await query(
      `UPDATE bookings SET payment_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [order.id, bookingId]
    );

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
        name: session.user.name || undefined,
        email: session.user.email || undefined,
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