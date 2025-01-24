import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookings } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import logger from '@/lib/logger';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth();
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
    await db
      .update(bookings)
      .set({
        payment_status: 'paid',
        status: 'confirmed',
        payment_details: JSON.stringify({
          payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          signature: razorpay_signature,
          verified_at: new Date().toISOString()
        }),
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(bookings.id, bookingId))
      .execute();

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