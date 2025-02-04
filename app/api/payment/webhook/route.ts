import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      logger.error('Missing Razorpay signature');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing signature' 
      }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.error('Invalid webhook signature');
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid signature' 
      }, { status: 400 });
    }

    const payload = JSON.parse(body);
    const { 
      payload: { 
        payment: { entity: paymentEntity },
        order: { entity: orderEntity }
      } 
    } = payload;

    logger.info('Received webhook:', {
      orderId: orderEntity.id,
      paymentId: paymentEntity.id,
      status: paymentEntity.status
    });

    // Get booking details
    const bookingResult = await query(
      `SELECT id, status 
       FROM bookings 
       WHERE payment_details->>'razorpay_order_id' = $1`,
      [orderEntity.id]
    );

    if (bookingResult.rows.length === 0) {
      logger.error('Booking not found for order:', orderEntity.id);
      return NextResponse.json({ 
        success: false, 
        error: 'Booking not found' 
      }, { status: 404 });
    }

    const booking = bookingResult.rows[0];
    let bookingStatus = 'pending';
    let paymentStatus = paymentEntity.status;

    // Update booking status based on payment status
    if (paymentEntity.status === 'captured') {
      bookingStatus = 'confirmed';
      paymentStatus = 'completed';
    } else if (paymentEntity.status === 'failed') {
      bookingStatus = 'cancelled';
      paymentStatus = 'failed';
    }

    // Update booking
    await query(
      `UPDATE bookings 
       SET status = $1,
           payment_status = $2,
           payment_details = payment_details || $3::jsonb
       WHERE id = $4`,
      [
        bookingStatus,
        paymentStatus,
        JSON.stringify({
          razorpay_payment_id: paymentEntity.id,
          razorpay_signature: signature,
          payment_status: paymentEntity.status,
          payment_method: paymentEntity.method,
          updated_at: new Date().toISOString()
        }),
        booking.id
      ]
    );

    logger.info('Updated booking status:', {
      bookingId: booking.id,
      status: bookingStatus,
      paymentStatus
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Webhook processing error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      success: false,
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 