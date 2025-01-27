import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import crypto from 'crypto';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const {
      bookingId,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
    } = await request.json();

    // Verify booking belongs to user
    const booking = await query(
      'SELECT * FROM bookings WHERE id = $1 AND user_id = $2 LIMIT 1',
      [bookingId, session.user.id]
    );

    if (!booking?.length) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Update booking status
    await query(
      'UPDATE bookings SET payment_status = $1, payment_id = $2, status = $3, updated_at = $4 WHERE id = $5',
      ['paid', razorpay_payment_id, 'confirmed', new Date(), bookingId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Error verifying payment:', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
} 