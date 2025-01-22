import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { validatePaymentVerification } from '@/lib/razorpay';
import { db } from '@/lib/db';
import { bookings } from '@/lib/schema';
import logger from '@/lib/logger';
import { eq, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await request.json();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verify payment signature
    const isValid = validatePaymentVerification({
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      signature: razorpay_signature,
    });

    if (!isValid) {
      return NextResponse.json(
        { message: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Update booking status
    const [booking] = await db
      .update(bookings)
      .set({
        payment_id: razorpay_payment_id,
        payment_status: 'paid',
        status: 'confirmed',
        updated_at: sql`strftime('%s', 'now')`
      })
      .where(eq(bookings.payment_id, razorpay_order_id))
      .returning();

    if (!booking) {
      return NextResponse.json(
        { message: 'Booking not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Payment verified successfully',
      booking: {
        id: booking.id,
        payment_status: booking.payment_status,
        status: booking.status
      }
    });

  } catch (error) {
    logger.error('Payment verification error:', error);
    return NextResponse.json(
      { message: 'Failed to verify payment' },
      { status: 500 }
    );
  }
} 