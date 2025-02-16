import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { EmailService } from '@/lib/email/service';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { QueryResult } from 'pg';

// Set timeout for the API route
export const maxDuration = 30; // 30 seconds timeout
export const dynamic = 'force-dynamic';

interface BookingRow {
  id: string;
  booking_id: string;
  user_name: string;
  user_phone: string;
  user_email: string;
  vehicle_name: string;
  user_id: string;
  start_date: Date;
  end_date: Date;
  total_price: number;
  status: string;
  payment_status: string;
  payment_details: any;
}

export async function POST(request: NextRequest) {
  const emailService = EmailService.getInstance();
  
  try {
    // Parse request body with error handling
    let body;
    try {
      body = await request.json();
    } catch (error) {
      logger.error('Failed to parse request body:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request body',
          details: 'The request body could not be parsed as JSON'
        },
        { status: 400 }
      );
    }

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature, 
      booking_id 
    } = body;

    logger.info('Payment verification received:', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      bookingId: booking_id,
      hasSignature: !!razorpay_signature
    });

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !booking_id) {
      logger.error('Missing required payment verification fields', {
        hasOrderId: !!razorpay_order_id,
        hasPaymentId: !!razorpay_payment_id,
        hasSignature: !!razorpay_signature,
        hasBookingId: !!booking_id
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          details: 'Please provide all required payment verification fields'
        },
        { status: 400 }
      );
    }

    // Try both environment variables for backward compatibility
    const secretKey = process.env.RAZORPAY_KEY_SECRET || process.env.RAZORPAY_SECRET_KEY;
    if (!secretKey) {
      logger.error('Razorpay secret key is not configured', {
        hasKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
        hasSecretKey: !!process.env.RAZORPAY_SECRET_KEY
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Configuration error',
          details: 'Payment verification is not properly configured. Please contact support.'
        },
        { status: 500 }
      );
    }

    // Get booking details with timeout and index hint
    const bookingPromise: Promise<QueryResult<BookingRow>> = query(
      `SELECT /*+ INDEX(b bookings_booking_id_idx) */
              b.*, 
              u.name as user_name, 
              u.phone as user_phone,
              u.email as user_email,
              v.name as vehicle_name,
              u.id as user_id
       FROM bookings b
       INNER JOIN users u ON b.user_id = u.id
       INNER JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.booking_id = $1
       FOR UPDATE NOWAIT`,
      [booking_id]
    );

    const bookingResult = await Promise.race([
      bookingPromise,
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      )
    ]);

    if (!bookingResult || bookingResult.rowCount === 0) {
      logger.error('Booking not found:', { bookingId: booking_id });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Booking not found',
          details: 'The booking associated with this payment could not be found'
        },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Verify the payment signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', secretKey)
      .update(text)
      .digest('hex');

    const isValidSignature = generated_signature === razorpay_signature;

    // Start transaction with timeout and NOWAIT
    await query('BEGIN');

    try {
      if (isValidSignature) {
        // Update booking payment status and details with optimized query
        const paymentDetails = {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          payment_verified_at: new Date().toISOString(),
          payment_status: 'completed'
        };

        const updateResult = await query(
          `UPDATE bookings 
           SET status = 'confirmed',
               payment_status = 'completed',
               payment_details = $1::jsonb,
               updated_at = NOW()
           WHERE booking_id = $2
           AND (status != 'confirmed' OR payment_status != 'completed')
           RETURNING id, status, payment_status, payment_details`,
          [JSON.stringify(paymentDetails), booking_id]
        );

        await query('COMMIT');

        // Prepare notification content
        const notificationContent = {
          userName: booking.user_name || 'User',
          vehicleName: booking.vehicle_name,
          bookingId: booking.booking_id,
          startDate: formatDate(booking.start_date),
          endDate: formatDate(booking.end_date),
          amount: formatCurrency(booking.total_price),
          paymentId: razorpay_payment_id
        };

        // Queue notifications asynchronously
        void Promise.all([
          // Queue WhatsApp notification
          booking.user_phone ? query(
            `INSERT INTO notification_queue (
              type, recipient, data, status, created_at
            ) VALUES ($1, $2, $3, $4, NOW())`,
            [
              'whatsapp_booking_confirmation',
              booking.user_phone,
              JSON.stringify(notificationContent),
              'pending'
            ]
          ).catch(error => {
            logger.error('Failed to queue WhatsApp notification:', error);
            return null;
          }) : null,

          // Send email notification
          booking.user_email ? emailService.sendBookingConfirmation(
            booking.user_email,
            notificationContent
          ).catch(error => {
            logger.error('Failed to send email confirmation:', error);
            return null;
          }) : null
        ]).catch(error => {
          logger.error('Error in notification promises:', error);
          return null;
        });

        return NextResponse.json({
          success: true,
          message: 'Payment verified and booking confirmed',
          data: {
            booking_id: booking.booking_id,
            status: 'confirmed',
            payment_status: 'completed',
            redirect_url: `/bookings/${booking.booking_id}`
          }
        });
      } else {
        await query('ROLLBACK');
        logger.error('Invalid payment signature', {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          expectedSignature: generated_signature,
          receivedSignature: razorpay_signature
        });
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid signature',
            details: 'The payment signature verification failed. Please contact support if payment was deducted.'
          },
          { status: 400 }
        );
      }
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Payment verification error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    // Ensure we always return a valid JSON response
    return NextResponse.json(
      { 
        success: false, 
        error: 'Payment verification failed',
        details: error instanceof Error ? 
          error.message : 
          'An unexpected error occurred during payment verification. Please try again.'
      },
      { status: 500 }
    );
  }
} 