import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { razorpay } from '@/lib/razorpay';

export async function POST(
  request: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId } = params;

    // Get booking from database
    const result = await query(
      'SELECT * FROM bookings WHERE booking_id = $1 AND user_id = $2',
      [bookingId, session.user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const booking = result.rows[0];

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: Math.round(booking.total_price * 100), // Convert to paise
      currency: 'INR',
      receipt: booking.booking_id,
      notes: {
        booking_id: booking.booking_id,
        user_id: session.user.id
      }
    });

    // Update booking with order details
    await query(
      'UPDATE bookings SET payment_details = $1 WHERE id = $2',
      [JSON.stringify({ order_id: order.id }), booking.id]
    );

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency
      }
    });
  } catch (error) {
    logger.error('Error creating payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment' },
      { status: 500 }
    );
  }
} 