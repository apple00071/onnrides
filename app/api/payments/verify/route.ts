import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { WhatsAppService } from '@/lib/whatsapp/service';
import { EmailService } from '@/lib/email/service';
import { formatDate, formatCurrency } from '@/lib/utils';

export async function POST(request: NextRequest) {
  const whatsappService = WhatsAppService.getInstance();
  const emailService = EmailService.getInstance();
  
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

    const secretKey = process.env.RAZORPAY_SECRET_KEY;
    if (!secretKey) {
      logger.error('Razorpay secret key is not configured');
      return NextResponse.json(
        { success: false, error: 'Payment verification is not properly configured' },
        { status: 500 }
      );
    }

    // Get booking details first
    const bookingResult = await query(
      `SELECT b.*, 
              u.name as user_name, 
              u.phone as user_phone,
              u.email as user_email,
              v.name as vehicle_name,
              u.id as user_id
       FROM bookings b
       INNER JOIN users u ON b.user_id = u.id
       INNER JOIN vehicles v ON b.vehicle_id = v.id
       WHERE b.booking_id = $1
       FOR UPDATE`,
      [booking_id]
    );

    if (bookingResult.rowCount === 0) {
      throw new Error('Booking details not found');
    }

    const booking = bookingResult.rows[0];

    // Verify the payment signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', secretKey)
      .update(text)
      .digest('hex');

    const isValidSignature = generated_signature === razorpay_signature;

    // Start transaction
    await query('BEGIN');

    try {
      if (isValidSignature) {
        // Update booking payment status and details
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
           RETURNING id, status, payment_status, payment_details`,
          [JSON.stringify(paymentDetails), booking_id]
        );

        await query('COMMIT');

        // Send booking confirmation notifications
        const bookingStartDate = formatDate(booking.start_date);
        const amount = formatCurrency(booking.total_price);

        // Prepare notification content
        const notificationContent = {
          userName: booking.user_name || 'User',
          vehicleName: booking.vehicle_name,
          bookingId: booking.booking_id,
          startDate: bookingStartDate,
          endDate: formatDate(booking.end_date),
          amount: amount,
          paymentId: razorpay_payment_id
        };

        // Send notifications asynchronously
        Promise.allSettled([
          // Send WhatsApp notification
          booking.user_phone ? 
            whatsappService.sendBookingConfirmation(
              booking.user_phone,
              notificationContent.userName,
              notificationContent.vehicleName,
              notificationContent.startDate,
              booking.booking_id
            ).catch(error => logger.error('Failed to send WhatsApp booking confirmation:', error)) : 
            Promise.resolve(),

          // Send email notification  
          booking.user_email ?
            emailService.sendBookingConfirmation(
              booking.user_email,
              notificationContent
            ).catch(error => logger.error('Failed to send email booking confirmation:', error)) :
            Promise.resolve()
        ]).catch(error => {
          logger.error('Error sending notifications:', error);
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
        // Payment verification failed
        const failureDetails = {
          razorpay_order_id,
          razorpay_payment_id,
          error: 'Invalid payment signature',
          failed_at: new Date().toISOString()
        };

        await query(
          `UPDATE bookings 
           SET status = 'payment_failed',
               payment_status = 'failed',
               payment_details = $1::jsonb,
               updated_at = NOW()
           WHERE booking_id = $2`,
          [JSON.stringify(failureDetails), booking_id]
        );

        // Send failure notifications with support details
        const supportEmail = 'support@onnrides.com';
        const supportPhone = '+91 8247494622';
        
        const failureContent = {
          userName: booking.user_name || 'User',
          bookingId: booking.booking_id,
          amount: formatCurrency(booking.total_price),
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          supportEmail,
          supportPhone
        };

        // Send notifications
        if (booking.user_email) {
          emailService.sendPaymentFailure(
            booking.user_email,
            failureContent
          ).catch(error => logger.error('Failed to send email failure notification:', error));
        }

        await query('COMMIT');

        return NextResponse.json(
          { 
            success: false, 
            error: 'Payment verification failed',
            data: {
              booking_id: booking.booking_id,
              status: 'payment_failed',
              payment_status: 'failed',
              support: {
                email: supportEmail,
                phone: supportPhone
              }
            }
          },
          { status: 400 }
        );
      }
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