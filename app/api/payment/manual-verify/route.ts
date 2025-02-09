import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user as any).role !== 'admin') {
      logger.error('Authentication failed: Admin access required');
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 401 }
      );
    }

    // Get the booking ID and payment details from the request
    const {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id
    } = await request.json();

    if (!bookingId || !razorpay_order_id || !razorpay_payment_id) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update the booking status and payment details
    const result = await query(
      `UPDATE bookings 
       SET status = 'confirmed',
           payment_status = 'completed',
           payment_details = payment_details || $1::jsonb
       WHERE id = $2
       RETURNING id`,
      [
        JSON.stringify({
          razorpay_order_id,
          razorpay_payment_id,
          payment_status: 'completed',
          payment_completed_at: new Date().toISOString(),
          manually_verified: true,
          verified_by: session.user.email,
          verified_at: new Date().toISOString()
        }),
        bookingId
      ]
    );

    if (result.rowCount === 0) {
      logger.error('Booking not found:', { bookingId });
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    logger.info('Booking manually verified:', {
      bookingId,
      verifiedBy: session.user.email
    });

    return NextResponse.json({
      success: true,
      message: 'Booking verified successfully',
      data: {
        bookingId: result.rows[0].id
      }
    });
  } catch (error) {
    logger.error('Manual verification error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Failed to verify booking' },
      { status: 500 }
    );
  }
} 