import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { bookings } from '@/lib/schema';
import { verifyAuth } from '@/lib/auth';
import type { User } from '@/lib/types';
import { eq, sql } from 'drizzle-orm';
import QRCode from 'qrcode';

interface AuthResult {
  user: User;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth() as AuthResult | null;

    if (!auth) {
      return NextResponse.json(
        { message: 'Unauthorized' },
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

    if (booking.user_id !== auth.user.id) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Implement payment processing
    // For now, just mark the booking as paid
    await db
      .update(bookings)
      .set({
        payment_status: 'paid',
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(bookings.id, bookingId))
      .execute();

    return NextResponse.json({
      message: 'Payment successful',
      booking: {
        id: booking.id,
        payment_status: 'paid'
      }
    });

  } catch (error) {
    logger.error('Payment error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 