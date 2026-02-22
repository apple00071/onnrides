import { NextRequest, NextResponse } from 'next/server';
import { query, withTransaction } from '../../../../lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validatePaymentVerification } from '@/lib/razorpay';
import { AdminNotificationService } from '@/lib/notifications/admin-notification';
import { WhatsAppNotificationService } from '@/lib/whatsapp/notification-service';
import { randomUUID } from 'crypto';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Increase timeout to 60s to allow sequential WhatsApp notifications

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function POST(request: NextRequest) {
  let booking: any;
  try {
    // Auth check: must be logged in
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, booking_id } = body;

    // Validate required fields
    if (!razorpay_payment_id || !booking_id) {
      return NextResponse.json({
        success: false,
        error: 'Missing required payment verification fields'
      }, { status: 400 });
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking_id);

    // Check if payment already exists (Idempotency check) outside transaction first to avoid locking if not needed
    const existingPayment = await query(
      'SELECT id, booking_id FROM payments WHERE reference = $1',
      [razorpay_payment_id]
    );

    if (existingPayment.rowCount && existingPayment.rowCount > 0) {
      const payment = existingPayment.rows[0];
      logger.info('Payment already processed (idempotency hit):', {
        razorpay_payment_id,
        booking_id: payment.booking_id
      });
      return NextResponse.json({
        success: true,
        message: 'Payment already verified'
      });
    }

    // Use withTransaction helper from @/lib/db to ensure all queries run on the same client
    await withTransaction(async (client: any) => {
      // Re-verify inside transaction with lock to be absolutely safe
      const doubleCheckPayment = await client.query(
        'SELECT id FROM payments WHERE reference = $1 FOR UPDATE',
        [razorpay_payment_id]
      );

      if (doubleCheckPayment.rowCount && doubleCheckPayment.rowCount > 0) {
        return; // Idempotency within transaction
      }

      // Find and lock the booking row
      const queryText = `
         SELECT b.*, v.name as vehicle_name, u.email as user_email, u.name as user_name, u.phone as user_phone
         FROM bookings b
         INNER JOIN vehicles v ON b.vehicle_id = v.id
         INNER JOIN users u ON b.user_id = u.id
         WHERE ${isUuid ? 'b.id = $1::uuid' : 'b.booking_id = $1::text'}
         FOR UPDATE`;

      const bookingLockResult = await client.query(queryText, [booking_id]);

      if (bookingLockResult.rowCount === 0) {
        throw new Error('Booking not found');
      }

      booking = bookingLockResult.rows[0];

      // Verify payment signature if order_id is present
      if (razorpay_order_id && razorpay_signature) {
        const isValid = validatePaymentVerification({
          order_id: razorpay_order_id,
          payment_id: razorpay_payment_id,
          signature: razorpay_signature
        });

        if (!isValid) {
          throw new Error('Invalid payment signature');
        }
      }

      // Update booking status
      await client.query(
        `UPDATE bookings 
         SET payment_status = 'partially_paid',
             status = 'confirmed',
             payment_reference = $1::text,
             payment_details = $2::jsonb,
             paid_amount = CEIL(total_price * 0.05),
             pending_amount = total_price - CEIL(total_price * 0.05),
             updated_at = NOW()
         WHERE id = $3::uuid`,
        [
          razorpay_payment_id,
          JSON.stringify(body),
          booking.id
        ]
      );

      // Create payment record
      await client.query(
        `INSERT INTO payments (
          id, booking_id, amount, status, method, reference, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          randomUUID(),
          booking.id,
          Math.ceil(booking.total_price * 0.05),
          'completed',
          'online',
          razorpay_payment_id
        ]
      );
    });

    // Send notifications sequentially
    // maxDuration is set to 60s at the top of the file to allow these to complete
    // because WaSenderService introduces a 5.5s delay between messages.
    try {
      const adminNotificationService = AdminNotificationService.getInstance();
      const whatsappService = WhatsAppNotificationService.getInstance();

      // Notify Customer (Consolidated Message)
      try {
        const amountPaid = Math.ceil(Number(booking.total_price) * 0.05);

        logger.info('Notification Amount Debug:', {
          totalPrice: booking.total_price,
          calculatedAmount: amountPaid,
          razorpayAmount: razorpay_payment_id ? 'Wait for webhook verification' : 'N/A'
        });

        await whatsappService.sendBookingSuccessNotification({
          id: booking.id,
          booking_id: booking.booking_id,
          payment_id: razorpay_payment_id,
          amount: amountPaid,
          customer_name: booking.user_name,
          phone_number: booking.phone_number || booking.user_phone || session.user.image,
          vehicle_model: booking.vehicle_name,
          start_date: booking.start_date,
          end_date: booking.end_date,
          total_amount: booking.total_price,
          status: 'confirmed',
          pickup_location: booking.pickup_location
        });
        logger.info('Customer consolidated booking success notification sent', { bookingId: booking.id });
      } catch (waError) {
        logger.error('Failed to send customer WhatsApp notification:', waError);
      }

    } catch (notifyError) {
      logger.error('Error in notification chain:', notifyError);
    }

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully'
    });
  } catch (error) {
    logger.error('Payment verification error object:', error);
    if (error instanceof Error) {
      logger.error('Stack trace:', error.stack);
      logger.error('Error message:', error.message);
      logger.error('Error name:', error.name);
    }

    // Send failure notification to admins if we have booking info
    if (booking) {
      try {
        const adminNotificationService = AdminNotificationService.getInstance();
        await adminNotificationService.sendNotification({
          type: 'payment',
          title: '⚠️ Payment Verification Failed',
          message: `Payment verification failed for booking ${booking.booking_id}`,
          data: {
            booking_id: booking.booking_id,
            user_name: booking.user_name,
            user_email: booking.user_email,
            vehicle_name: booking.vehicle_name,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
            timestamp: new Date()
          }
        });
      } catch (notifyError) {
        logger.error('Failed to send payment failure notification to admins:', notifyError);
      }
    }

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Payment verification failed',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 400 });
  }
}
