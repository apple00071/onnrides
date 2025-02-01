import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    logger.info('Payment verification request received:', {
      ...body,
      razorpay_payment_id: '***',
      razorpay_signature: '***'
    });

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      bookingId 
    } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !bookingId) {
      logger.warn('Missing required fields:', { 
        hasOrderId: !!razorpay_order_id,
        hasPaymentId: !!razorpay_payment_id,
        hasSignature: !!razorpay_signature,
        hasBookingId: !!bookingId
      });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get the secret key from environment variables
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      logger.error('Razorpay secret key not found');
      return NextResponse.json(
        { error: 'Payment verification configuration error' },
        { status: 500 }
      );
    }

    // Verify the payment signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    logger.debug('Signature verification:', {
      text,
      provided_signature: '***',
      generated_signature: '***',
      matches: generated_signature === razorpay_signature
    });

    if (generated_signature !== razorpay_signature) {
      logger.warn('Invalid payment signature');
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Get booking details first
    const bookingResult = await query(`
      SELECT * FROM bookings 
      WHERE id = $1 
      LIMIT 1
    `, [bookingId]);

    if (!bookingResult.rows.length) {
      logger.error('Booking not found:', { bookingId });
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];
    logger.info('Found booking:', { bookingId, booking });

    // Update booking payment status and details
    const paymentDetails = {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      verified_at: new Date().toISOString()
    };

    const result = await query(`
      UPDATE bookings 
      SET 
        payment_status = 'completed',
        payment_details = $1::jsonb,
        status = 'confirmed',
        updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [JSON.stringify(paymentDetails), bookingId]);

    if (result.rowCount === 0) {
      logger.error('Failed to update booking:', { bookingId });
      return NextResponse.json(
        { error: 'Failed to update booking' },
        { status: 500 }
      );
    }

    logger.info('Payment verified and booking updated:', {
      bookingId,
      payment_id: razorpay_payment_id,
      order_id: razorpay_order_id
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        booking: result.rows[0]
      }
    });
  } catch (error) {
    logger.error('Payment verification error:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
} 