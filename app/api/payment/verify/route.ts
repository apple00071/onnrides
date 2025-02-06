import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendBookingConfirmationEmail } from '@/lib/email';

// New route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Get session
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      logger.error('No user session found during payment verification');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const body = await request.json();
    const { payment_reference, order_id } = body;

    if (!payment_reference || !order_id) {
      logger.error('Missing payment verification data', { payment_reference, order_id });
      return NextResponse.json(
        { success: false, error: 'Payment reference and order ID are required' },
        { status: 400 }
      );
    }

    logger.info('Starting payment verification', {
      userId,
      payment_reference,
      order_id
    });

    // Begin transaction
    await query('BEGIN');

    try {
      // Update payment status
      logger.info('Updating payment status', { order_id });
      const updatePayment = await query(
        'UPDATE payments SET status = $1, payment_reference = $2, updated_at = NOW() WHERE order_id = $3 RETURNING *',
        ['success', payment_reference, order_id]
      );

      if (updatePayment.rowCount === 0) {
        logger.error('Payment record not found', { order_id });
        throw new Error('Payment not found');
      }

      // Get booking details for email
      logger.info('Fetching booking details', { booking_id: updatePayment.rows[0].booking_id });
      const bookingResult = await query(
        `SELECT b.*, v.name as vehicle_name 
         FROM bookings b 
         LEFT JOIN vehicles v ON b.vehicle_id = v.id 
         WHERE b.id = $1`,
        [updatePayment.rows[0].booking_id]
      );

      if (bookingResult.rowCount === 0) {
        logger.error('Booking not found', { booking_id: updatePayment.rows[0].booking_id });
        throw new Error('Booking not found');
      }

      const booking = {
        ...bookingResult.rows[0],
        vehicle: {
          name: bookingResult.rows[0].vehicle_name
        }
      };

      // Send confirmation email
      logger.info('Sending booking confirmation email', { 
        email: session.user.email,
        booking_id: booking.id 
      });
      
      await sendBookingConfirmationEmail(booking, session.user.email);

      // Commit transaction
      await query('COMMIT');
      logger.info('Payment verification completed successfully', { order_id });

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully'
      });
    } catch (error) {
      await query('ROLLBACK');
      logger.error('Payment verification transaction error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        order_id
      });
      throw error;
    }
  } catch (error) {
    logger.error('Payment verification error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to verify payment' 
      },
      { status: 500 }
    );
  }
} 