import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logger.error('Authentication failed: No session found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get the payment verification details from the request
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = await request.json();

    logger.info('Received payment verification request:', {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature: '***'
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      logger.error('Missing payment verification details');
      return NextResponse.json(
        { error: 'Missing payment verification details' },
        { status: 400 }
      );
    }

    // Verify the payment signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      logger.error('Payment signature verification failed', {
        provided: razorpay_signature,
        generated: generated_signature
      });
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    try {
      // First try to find booking by razorpay_order_id in payment_details
      let findBookingResult = await query(
        `SELECT id, payment_details 
         FROM bookings 
         WHERE status = 'pending' 
         AND created_at > NOW() - INTERVAL '1 hour'
         ORDER BY created_at DESC 
         LIMIT 1`
      );

      if (!findBookingResult.rows.length) {
        logger.error('No recent pending booking found');
        return NextResponse.json(
          { error: 'No recent pending booking found' },
          { status: 404 }
        );
      }

      const bookingId = findBookingResult.rows[0].id;
      logger.info('Found booking to update:', { bookingId });

      // Update the booking status and payment details
      const updateResult = await query(
        `UPDATE bookings 
         SET status = 'confirmed',
             payment_status = 'completed',
             payment_details = $1::jsonb,
             updated_at = NOW()
         WHERE id = $2
         RETURNING id, status, payment_status`,
        [
          JSON.stringify({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            payment_status: 'completed',
            payment_completed_at: new Date().toISOString()
          }),
          bookingId
        ]
      );

      if (updateResult.rowCount === 0) {
        logger.error('Failed to update booking - no rows affected', { bookingId });
        return NextResponse.json(
          { error: 'Failed to update booking' },
          { status: 500 }
        );
      }

      logger.info('Successfully updated booking:', {
        bookingId,
        status: updateResult.rows[0].status,
        payment_status: updateResult.rows[0].payment_status
      });

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          bookingId,
          status: updateResult.rows[0].status
        }
      });
    } catch (dbError) {
      logger.error('Database operation failed:', {
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        stack: dbError instanceof Error ? dbError.stack : undefined,
        details: dbError
      });
      
      return NextResponse.json(
        { error: 'Database operation failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Payment verification error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
} 