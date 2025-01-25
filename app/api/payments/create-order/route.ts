import { NextRequest } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { bookings } from '@/lib/schema';
import { verifyAuth } from '@/lib/auth';
import { eq } from 'drizzle-orm';
import { createOrder } from '@/lib/razorpay';

interface BookingRow {
  id: string;
  user_id: string;
  vehicle_id: string;
  total_price: number;
  start_date: Date;
  end_date: Date;
  total_hours: number;
  status: string;
  payment_status: string;
  payment_details: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth();
    if (!user) {
      return new Response(JSON.stringify({ message: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { bookingId } = await request.json();
    if (!bookingId) {
      return new Response(JSON.stringify({ message: 'Booking ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const booking = await db
      .select()
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!booking) {
      return new Response(JSON.stringify({ message: 'Booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (booking.user_id !== user.id) {
      return new Response(JSON.stringify({ message: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create Razorpay order
    const razorpayOrder = await createOrder({
      amount: Number(booking.total_price.toFixed(2)),
      currency: 'INR',
      receipt: bookingId,
      notes: {
        booking_id: bookingId,
        user_id: user.id
      }
    });

    // Update booking with order details
    await db
      .update(bookings)
      .set({
        payment_details: JSON.stringify({
          order_id: razorpayOrder.id,
          amount: Number((razorpayOrder.amount / 100).toFixed(2)),
          currency: razorpayOrder.currency,
          status: razorpayOrder.status,
          created_at: new Date().toISOString()
        }),
        updated_at: new Date()
      })
      .where(eq(bookings.id, bookingId))
      .execute();

    return new Response(JSON.stringify({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      },
      prefill: {
        email: user.email || '',
      },
      theme: {
        color: '#F8B602'
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logger.error('Error creating order:', error);
    return new Response(JSON.stringify({ message: 'Failed to create order' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 