import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { validatePaymentVerification } from '@/lib/razorpay';
import { AdminNotificationService } from '@/lib/notifications/admin-notification';
import { formatDate } from '@/lib/utils/time-formatter';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

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

    // Begin transaction
    await query('BEGIN');

    try {
      // Determine if the booking_id is a UUID or a custom short ID
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(booking_id);

      // Find and lock the booking row
      const queryText = `
         SELECT b.*, v.name as vehicle_name, u.email as user_email, u.name as user_name
         FROM bookings b
         INNER JOIN vehicles v ON b.vehicle_id = v.id
         INNER JOIN users u ON b.user_id = u.id
         WHERE ${isUuid ? 'b.id = $1::uuid' : 'b.booking_id = $1::text'}
         FOR UPDATE`;

      const bookingLockResult = await query(queryText, [booking_id]);

      if (bookingLockResult.rowCount === 0) {
        throw new Error('Booking not found');
      }

      const booking = bookingLockResult.rows[0];

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
      // Update booking status
      await query(
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
      await query(
        `INSERT INTO payments (
          id, booking_id, amount, status, method, reference, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          crypto.randomUUID(),
          booking.id,
          booking.total_price,
          'completed',
          'online',
          razorpay_payment_id
        ]
      );

      // Commit transaction
      await query('COMMIT');

      // Send admin notification
      try {
        const adminNotificationService = AdminNotificationService.getInstance();
        await adminNotificationService.sendPaymentNotification({
          booking_id: booking.booking_id || booking.id,
          payment_id: razorpay_payment_id,
          user_name: booking.user_name,
          amount: booking.total_price,
          payment_method: 'Online',
          status: 'success',
          transaction_time: new Date()
        });
      } catch (adminNotifyError) {
        logger.error('Failed to send admin payment notification:', adminNotifyError);
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully'
      });

    } catch (txError) {
      await query('ROLLBACK');
      throw txError;
    }
  } catch (error) {
    logger.error('Payment verification error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Payment verification failed'
    }, { status: 400 });
  }
}
