import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createOrder } from '../../../../lib/razorpay';
import { db } from '@/lib/db';
import { bookings } from '@/lib/schema';
import logger from '@/lib/logger';
import { eq, sql } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { bookingId } = await request.json();
    if (!bookingId) {
      return NextResponse.json(
        { message: 'Booking ID is required' },
        { status: 400 }
      );
    }

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
        { message: 'Forbidden' },
        { status: 403 }
      );
    }

    // Create order
    const order = {
      order_id: 'order_' + Math.random().toString(36).substring(7),
      amount: booking.total_price,
      currency: 'INR',
      status: 'created',
      created_at: new Date().toISOString()
    };

    // Update booking with order details
    await db
      .update(bookings)
      .set({
        payment_details: sql`${JSON.stringify(order)}::jsonb`,
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(bookings.id, bookingId))
      .execute();

    return NextResponse.json({
      message: 'Order created successfully',
      order
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 