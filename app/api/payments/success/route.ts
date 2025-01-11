import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { COLLECTIONS, findOneBy, updateOne } from '@/lib/db';
import type { Booking } from '@/lib/types';

// POST /api/payments/success - Handle successful payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bookingId, paymentId, paymentReference } = body;

    if (!bookingId || !paymentId || !paymentReference) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get booking
    const booking = await findOneBy<Booking>(COLLECTIONS.BOOKINGS, 'id', bookingId);
    if (!booking) {
      logger.error('Booking not found:', { bookingId });
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update booking status
    await updateOne(COLLECTIONS.BOOKINGS, bookingId, {
      status: 'confirmed',
      paymentStatus: 'paid',
      paymentId,
      paymentReference,
      updatedAt: new Date()
    });

    logger.debug('Payment processed successfully:', {
      bookingId,
      paymentId,
      paymentReference
    });

    return NextResponse.json({
      success: true,
      message: 'Payment processed successfully'
    });

  } catch (error) {
    logger.error('Failed to process payment:', error);
    return NextResponse.json(
      { error: 'Failed to process payment' },
      { status: 500 }
    );
  }
} 