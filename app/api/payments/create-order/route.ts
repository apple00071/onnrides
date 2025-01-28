import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { createOrder } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Validate environment variables
    const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
    const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      logger.error('Missing Razorpay environment variables');
      return NextResponse.json({
        success: false,
        error: 'Payment system configuration error'
      }, { status: 500 });
    }

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get and validate request data
    const body = await request.json();
    const { bookingId, amount } = body;

    if (!bookingId) {
      return NextResponse.json({
        success: false,
        error: 'Booking ID is required'
      }, { status: 400 });
    }

    // Get booking details
    const bookingResult = await query(
      'SELECT * FROM bookings WHERE id = $1 AND user_id = $2 LIMIT 1',
      [bookingId, session.user.id]
    );

    const booking = bookingResult.rows[0];
    if (!booking) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 });
    }

    // Create Razorpay order
    const amountInPaise = Math.round(Number(booking.total_price) * 100);
    logger.info('Creating order with amount:', { amountInPaise, bookingId });

    const razorpayOrder = await createOrder({
      amount: amountInPaise,
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
       SET payment_details = $1::jsonb, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [JSON.stringify({
        order_id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        status: razorpayOrder.status,
        created_at: new Date().toISOString()
      }), bookingId]
    );

    logger.info('Order created successfully:', { 
      orderId: razorpayOrder.id, 
      bookingId 
    });

    return NextResponse.json({
      success: true,
      data: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: RAZORPAY_KEY_ID,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status,
        created_at: razorpayOrder.created_at
      }
    });

  } catch (error) {
    logger.error('Error creating payment order:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment order'
    }, { status: 500 });
  }
}