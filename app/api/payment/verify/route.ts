import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logger.error('Authentication failed: No session found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the payment verification details from the request
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = await request.json();

    // Verify the payment signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      logger.error('Payment signature verification failed');
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Find the booking with this order ID
    const findBookingResult = await query(
      `SELECT id FROM bookings 
       WHERE payment_details->>'razorpay_order_id' = $1`,
      [razorpay_order_id]
    );

    if (!findBookingResult.rows.length) {
      logger.error('No booking found for order ID:', razorpay_order_id);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const bookingId = findBookingResult.rows[0].id;

    // Update the booking status and payment details
    await query(
      `UPDATE bookings 
       SET status = 'confirmed',
           payment_status = 'completed',
           payment_details = payment_details || $1::jsonb
       WHERE id = $2`,
      [
        JSON.stringify({
          razorpay_payment_id,
          razorpay_signature,
          payment_status: 'completed',
          payment_completed_at: new Date().toISOString()
        }),
        bookingId
      ]
    );

    logger.info('Payment verified and booking updated:', {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        bookingId
      }
    });
  } catch (error) {
    logger.error('Payment verification error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
} 