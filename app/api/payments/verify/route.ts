import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const {
      bookingId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = await request.json();

    if (!bookingId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return NextResponse.json(
        { message: 'Missing required payment details' },
        { status: 400 }
      );
    }

    // Get booking
    const booking = await query(
      `SELECT * FROM bookings WHERE id = $1 LIMIT 1`,
      [bookingId]
    ).then(rows => rows[0]);

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

    // Verify signature
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', secret!)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { message: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Update booking with payment details
    await query(
      `UPDATE bookings SET payment_status = 'paid', status = 'confirmed', payment_details = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [
        JSON.stringify({
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          signature: razorpay_signature,
          verified_at: new Date().toISOString()
        }),
        bookingId
      ]
    );

    return NextResponse.json({
      message: 'Payment verified successfully'
    });

  } catch (error) {
    logger.error('Payment verification error:', error);
    return NextResponse.json(
      { message: 'Failed to verify payment' },
      { status: 500 }
    );
  }
} 