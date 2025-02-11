import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { sendBookingConfirmationEmail } from '@/lib/email/service';
import { verifyEmailConfig } from '@/lib/email/config';

// New route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Remove old config if it exists
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

export async function POST(request: NextRequest): Promise<Response> {
  try {
    const body = await request.text();
    const signature = request.headers.get('x-razorpay-signature');

    if (!signature) {
      logger.error('Missing Razorpay signature');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing signature' 
      }, { status: 400 });
    }

    // Verify webhook signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      logger.error('Invalid webhook signature');
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid signature' 
      }, { status: 400 });
    }

    const payload = JSON.parse(body);
    const { 
      payload: { 
        payment: { entity: paymentEntity },
        order: { entity: orderEntity }
      } 
    } = payload;

    logger.info('Received webhook:', {
      orderId: orderEntity.id,
      paymentId: paymentEntity.id,
      status: paymentEntity.status
    });

    // Get booking details
    const bookingResult = await query(
      `SELECT b.*, v.name as vehicle_name, u.email as user_email
       FROM bookings b
       LEFT JOIN vehicles v ON b.vehicle_id = v.id
       LEFT JOIN users u ON b.user_id = u.id
       WHERE payment_details->>'razorpay_order_id' = $1`,
      [orderEntity.id]
    );

    if (bookingResult.rows.length === 0) {
      logger.error('Booking not found for order:', orderEntity.id);
      return NextResponse.json({ 
        success: false, 
        error: 'Booking not found' 
      }, { status: 404 });
    }

    const booking = bookingResult.rows[0];
    let bookingStatus = 'pending';
    let paymentStatus = paymentEntity.status;

    // Update booking status based on payment status
    if (paymentEntity.status === 'captured') {
      bookingStatus = 'confirmed';
      paymentStatus = 'completed';
    } else if (paymentEntity.status === 'failed') {
      bookingStatus = 'cancelled';
      paymentStatus = 'failed';
    }

    // Update booking
    await query(
      `UPDATE bookings 
       SET status = $1,
           payment_status = $2,
           payment_details = payment_details || $3::jsonb
       WHERE id = $4`,
      [
        bookingStatus,
        paymentStatus,
        JSON.stringify({
          razorpay_payment_id: paymentEntity.id,
          razorpay_signature: signature,
          payment_status: paymentEntity.status,
          payment_method: paymentEntity.method,
          updated_at: new Date().toISOString()
        }),
        booking.id
      ]
    );

    logger.info('Updated booking status:', {
      bookingId: booking.id,
      status: bookingStatus,
      paymentStatus
    });

    // Send confirmation email if payment was successful
    if (paymentEntity.status === 'captured') {
      // Verify email configuration
      const isEmailConfigValid = await verifyEmailConfig();
      
      if (!isEmailConfigValid) {
        logger.error('Email configuration is invalid', {
          smtp_user: process.env.SMTP_USER,
          smtp_from: process.env.SMTP_FROM
        });
      }

      // Send confirmation email regardless of config verification
      const emailBooking = {
        ...booking,
        id: booking.id,
        booking_id: booking.booking_id,
        displayId: booking.booking_id,
        vehicle: {
          name: booking.vehicle_name
        },
        payment_reference: paymentEntity.id,
        paymentStatus: paymentEntity.status,
        status: 'confirmed',
        startDate: booking.start_date,
        endDate: booking.end_date,
        pickupLocation: booking.pickup_location,
        totalPrice: `₹${parseFloat(booking.total_price || 0).toFixed(2)}`
      };

      logger.info('Preparing email with payment details:', {
        booking_id: booking.booking_id,
        payment_id: paymentEntity.id,
        payment_status: paymentEntity.status,
        payment_method: paymentEntity.method
      });

      // Replace direct email call with API endpoint call
      const sendEmailConfirmation = async (booking: any) => {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/email/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'booking-confirmation',
              data: {
                booking: emailBooking,
                userEmail: booking.user_email
              }
            })
          });

          if (!response.ok) {
            throw new Error('Failed to send email confirmation');
          }
        } catch (error) {
          logger.error('Failed to send webhook email confirmation:', error);
        }
      };

      // Replace the direct email call with the new function
      await sendEmailConfirmation(booking);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    logger.error('Webhook processing error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      success: false,
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 