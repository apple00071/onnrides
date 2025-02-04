import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { validatePaymentVerification } from '@/lib/razorpay';

export async function POST(request: NextRequest): Promise<Response> {
  try {
    logger.info('Payment verification request received');

    // Get the session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logger.error('Unauthorized payment verification attempt');
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    logger.info('Payment verification body:', body);

    const { reference } = body;
    if (!reference) {
      logger.error('Missing payment reference');
      return NextResponse.json({
        success: false,
        error: 'Payment reference is required'
      }, { status: 400 });
    }

    // Find the booking with this payment reference
    const bookingResult = await query(`
      SELECT * FROM bookings 
      WHERE payment_intent_id = $1 
      AND status = 'pending'
      AND user_id = $2
      LIMIT 1
    `, [reference, session.user.id]);

    if (bookingResult.rows.length === 0) {
      logger.error('No pending booking found for payment reference:', reference);
      return NextResponse.json({
        success: false,
        error: 'No pending booking found'
      }, { status: 404 });
    }

    const booking = bookingResult.rows[0];

    // Validate the payment
    try {
      // Update booking status
      await query(`
        UPDATE bookings 
        SET 
          status = 'confirmed',
          payment_status = 'paid',
          updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `, [booking.id]);

      logger.info('Booking updated successfully:', {
        bookingId: booking.id,
        status: 'confirmed',
        paymentStatus: 'paid'
      });

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        booking: {
          id: booking.id,
          status: 'confirmed',
          paymentStatus: 'paid'
        }
      });
    } catch (error) {
      logger.error('Payment verification failed:', error);
      return NextResponse.json({
        success: false,
        error: 'Payment verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }
  } catch (error) {
    logger.error('Error in payment verification:', error);
    return NextResponse.json({
      success: false,
      error: 'Payment verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 