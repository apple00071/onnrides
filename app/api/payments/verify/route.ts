import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '@/lib/db';
import { sql } from '@vercel/postgres';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = body;

    // Verify the payment signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY!)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Update booking payment status and details
    const result = await sql`
      UPDATE bookings 
      SET payment_status = 'completed',
          payment_details = ${JSON.stringify({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
          })}::jsonb,
          updated_at = NOW()
      WHERE id = ${booking_id}
      RETURNING *
    `;

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      booking: result.rows[0]
    });
  } catch (error) {
    logger.error('Payment verification error:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
} 