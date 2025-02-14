import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { sendBookingNotification } from '@/lib/whatsapp/integration';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
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
      logger.error('Missing required payment verification fields');
      return NextResponse.json(
        { success: false, error: 'Missing required fields for payment verification' },
        { status: 400 }
      );
    }

    // Verify the payment signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_SECRET_KEY!)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      logger.error('Invalid payment signature', {
        expected: generated_signature.substring(0, 10) + '...',
        received: razorpay_signature.substring(0, 10) + '...'
      });
      return NextResponse.json(
        { success: false, error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    // Start transaction
    await query('BEGIN');

    try {
      // First check if payment is already verified
      const paymentCheck = await query(
        `SELECT payment_status, status 
         FROM bookings 
         WHERE id = $1 OR booking_id = $1`,
        [booking_id]
      );

      if (paymentCheck.rowCount === 0) {
        throw new Error('Booking not found');
      }

      if (paymentCheck.rows[0].payment_status === 'completed') {
        await query('COMMIT');
        return NextResponse.json({
          success: true,
          message: 'Payment already verified',
          data: {
            booking_id,
            status: paymentCheck.rows[0].status,
            payment_status: 'completed',
            already_verified: true
          }
        });
      }

      // Get booking details with user and vehicle information
      const bookingResult = await query(
        `SELECT b.*, 
                u.name as user_name, 
                u.phone as user_phone,
                v.name as vehicle_name
         FROM bookings b
         LEFT JOIN users u ON b.user_id = u.id
         LEFT JOIN vehicles v ON b.vehicle_id = v.id
         WHERE b.id = $1 OR b.booking_id = $1
         FOR UPDATE`,
        [booking_id]
      );

      const booking = bookingResult.rows[0];

      // Update booking payment status and details
      const updateResult = await query(
        `UPDATE bookings 
         SET status = 'confirmed',
             payment_status = 'completed',
             payment_details = COALESCE(payment_details, '{}'::jsonb) || $1::jsonb,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [
          JSON.stringify({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            payment_verified_at: new Date().toISOString(),
            payment_status: 'completed'
          }),
          booking.id
        ]
      );

      if (updateResult.rowCount === 0) {
        throw new Error('Failed to update booking payment status');
      }

      // Send WhatsApp notification
      if (booking.user_phone) {
        try {
          await sendBookingNotification({
            id: booking.user_id,
            name: booking.user_name || '',
            phone: booking.user_phone,
            email: '',
            role: 'user',
            created_at: new Date().toISOString(),
            is_blocked: false
          }, {
            vehicleName: booking.vehicle_name,
            startDate: booking.start_date,
            endDate: booking.end_date,
            bookingId: booking.id,
            status: 'confirmed',
            totalPrice: booking.total_price
          });
        } catch (error) {
          logger.error('Failed to send WhatsApp notification:', error);
        }
      }

      // Commit transaction
      await query('COMMIT');

      logger.info('Payment verification successful:', {
        bookingId: booking.id,
        orderId: razorpay_order_id,
        status: 'confirmed'
      });

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          booking_id: booking.id,
          status: 'confirmed',
          payment_status: 'completed',
          redirect_url: `/bookings/${booking.id}`
        }
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    logger.error('Payment verification error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Payment verification failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        retry_allowed: true
      },
      { status: 500 }
    );
  }
} 