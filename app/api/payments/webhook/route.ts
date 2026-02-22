import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query, withTransaction } from '@/lib/db';
import logger from '@/lib/logger';
import { AdminNotificationService } from '@/lib/notifications/admin-notification';
import { WhatsAppNotificationService } from '@/lib/whatsapp/notification-service';

// Razorpay Webhook Secret from environment variables
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-razorpay-signature');

        if (!WEBHOOK_SECRET) {
            logger.error('RAZORPAY_WEBHOOK_SECRET is not configured');
            return NextResponse.json({ success: false, error: 'Webhook secret not configured' }, { status: 500 });
        }

        if (!signature) {
            logger.error('No x-razorpay-signature header found');
            return NextResponse.json({ success: false, error: 'No signature' }, { status: 400 });
        }

        // Verify signature
        const expectedSignature = crypto
            .createHmac('sha256', WEBHOOK_SECRET)
            .update(body)
            .digest('hex');

        if (expectedSignature !== signature) {
            logger.error('Invalid Razorpay webhook signature');
            return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
        }

        const payload = JSON.parse(body);
        const event = payload.event;

        logger.info(`Razorpay Webhook Received: ${event}`, {
            id: payload.account_id,
            event: event
        });

        if (event === 'payment_link.paid' || event === 'payment_link.partially_paid') {
            await handlePaymentLinkPaid(payload.payload.payment_link.entity, payload.payload.payment.entity);
        } else if (event === 'order.paid') {
            // We can also handle standard order payments here as a backup to the frontend verification
            logger.info('Order paid event received, skipping as frontend handles verification for now');
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Webhook processing error:', error);
        return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
    }
}

async function handlePaymentLinkPaid(linkEntity: any, paymentEntity: any) {
    // Handle unique reference_id (e.g. OR5NU_1740201234)
    const rawReferenceId = linkEntity.reference_id;
    const booking_id = rawReferenceId.includes('_') ? rawReferenceId.split('_')[0] : rawReferenceId;
    const amountPaidInPaise = paymentEntity.amount;
    const amountPaid = amountPaidInPaise / 100;
    const razorpay_payment_id = paymentEntity.id;

    logger.info('Processing payment_link.paid:', { booking_id, amountPaid, razorpay_payment_id });

    try {
        await withTransaction(async (client) => {
            // 1. Find the booking
            const bookingResult = await client.query(
                'SELECT * FROM bookings WHERE booking_id = $1 FOR UPDATE',
                [booking_id]
            );

            if (bookingResult.rowCount === 0) {
                throw new Error(`Booking ${booking_id} not found`);
            }

            const booking = bookingResult.rows[0];

            // 2. Check if payment already recorded (idempotency)
            const existingPayment = await client.query(
                'SELECT id FROM payments WHERE reference = $1',
                [razorpay_payment_id]
            );

            if (existingPayment.rowCount && existingPayment.rowCount > 0) {
                logger.info(`Payment ${razorpay_payment_id} already processed for booking ${booking_id}`);
                return;
            }

            // 3. Update booking
            // We need to determine if this was a partial payment (first payment) or a balance payment.
            // If status is 'pending', it's likely the first payment.

            let newStatus = booking.status;
            let newPaymentStatus = booking.payment_status;

            if (booking.status === 'pending') {
                newStatus = 'confirmed';
                newPaymentStatus = 'partially_paid';
            } else if (booking.pending_amount <= amountPaid) {
                newPaymentStatus = 'paid';
            } else {
                newPaymentStatus = 'partially_paid';
            }

            await client.query(
                `UPDATE bookings SET 
          status = $1,
          payment_status = $2,
          paid_amount = paid_amount + $3,
          pending_amount = pending_amount - $4,
          updated_at = NOW()
         WHERE id = $5`,
                [newStatus, newPaymentStatus, amountPaid, amountPaid, booking.id]
            );

            // 4. Record payment
            await client.query(
                `INSERT INTO payments (
          id, booking_id, amount, status, method, reference, created_at, updated_at
        ) VALUES (gen_random_uuid(), $1, $2, 'completed', 'online', $3, NOW(), NOW())`,
                [booking.id, amountPaid, razorpay_payment_id]
            );

            // 5. Trigger Notifications (Background)
            (async () => {
                try {
                    const adminNotificationService = AdminNotificationService.getInstance();
                    const whatsappService = WhatsAppNotificationService.getInstance();

                    // If it was the first payment, send "Booking Confirmed"
                    if (booking.status === 'pending') {
                        await whatsappService.sendBookingSuccessNotification({
                            ...booking,
                            amount: amountPaid,
                            payment_id: razorpay_payment_id
                        });
                    }

                    // Always notify Admin
                    await adminNotificationService.sendPaymentNotification({
                        booking_id: booking.booking_id,
                        payment_id: razorpay_payment_id,
                        user_name: booking.user_name || 'Customer',
                        amount: amountPaid,
                        payment_method: 'Online (Link)',
                        status: 'success',
                        transaction_time: new Date()
                    });

                } catch (notifyError) {
                    logger.error('Error in webhook notification chain:', notifyError);
                }
            })();
        });
    } catch (error) {
        logger.error('Error handling payment_link.paid logic:', error);
        throw error;
    }
}
