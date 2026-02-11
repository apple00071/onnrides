import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { sendBookingConfirmationEmail } from '@/lib/email';
import { verifyEmailConfig } from '@/lib/email/config';
import { formatDate } from '@/lib/utils/time-formatter';
import { AdminNotificationService } from '@/lib/notifications/admin-notification';

// New route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Define admin notification recipients
const ADMIN_EMAILS = process.env.ADMIN_EMAILS ? process.env.ADMIN_EMAILS.split(',') : ['contact@onnrides.com'];

export async function POST(request: NextRequest) {
  try {
    logger.info('Payment verification endpoint called');

    // Get session
    const session = await getServerSession(authOptions);
    logger.info('Session check result:', {
      hasSession: !!session,
      hasUserId: !!session?.user?.id,
      userEmail: session?.user?.email
    });

    if (!session?.user?.id) {
      logger.error('No user session found during payment verification');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const requestBody = await request.text(); // Get raw request body
    logger.info('Raw request body:', { body: requestBody });

    let body;
    try {
      body = JSON.parse(requestBody);
      logger.info('Parsed request body:', { body });
    } catch (e) {
      logger.error('Failed to parse request body:', { error: e, rawBody: requestBody });
      return NextResponse.json(
        { success: false, error: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { payment_reference, order_id: bookingId } = body;

    logger.info('Payment verification request received', {
      userId,
      payment_reference,
      bookingId,
      email: session.user.email,
      bodyKeys: Object.keys(body),
      bodyValues: Object.values(body)
    });

    // Validate input types
    logger.info('Input validation:', {
      payment_reference: {
        type: typeof payment_reference,
        value: payment_reference,
        length: payment_reference?.length
      },
      bookingId: {
        type: typeof bookingId,
        value: bookingId,
        length: bookingId?.length
      }
    });

    if (!payment_reference || !bookingId) {
      logger.error('Missing payment verification data', {
        payment_reference,
        bookingId,
        body: JSON.stringify(body)
      });
      return NextResponse.json(
        { success: false, error: 'Payment reference and booking ID are required' },
        { status: 400 }
      );
    }

    // Begin transaction
    await query('BEGIN');

    try {
      logger.info('Starting booking lookup with parameters:', {
        bookingId,
        booking_uuid: body.booking_id,
        userId,
        payment_reference,
        searchCriteria: [
          'booking_id',
          'id (uuid)',
          'payment_details->order_id',
          'payment_details->razorpay_order_id'
        ]
      });

      // First check if the booking exists without locking
      const bookingCheckResult = await query(
        `SELECT COUNT(*) as count 
         FROM bookings 
         WHERE booking_id = $1::text 
         OR id = $2::uuid`,
        [bookingId, body.booking_id]
      );

      logger.info('Initial booking check result:', {
        exists: bookingCheckResult.rows[0].count > 0,
        bookingId,
        booking_uuid: body.booking_id
      });

      // First lock the booking row with proper JSONB casting
      const bookingLockResult = await query(
        `SELECT b.*, v.name as vehicle_name, u.email as user_email
         FROM bookings b
         INNER JOIN vehicles v ON b.vehicle_id = v.id
         INNER JOIN users u ON b.user_id = u.id
         WHERE b.id = $2::uuid
         OR b.booking_id = $1::text
         OR CASE 
            WHEN b.payment_details IS NOT NULL 
            THEN (
              CASE 
                WHEN jsonb_typeof(COALESCE(b.payment_details::jsonb, '{}'::jsonb)) = 'object'
                THEN (
                  b.payment_details::jsonb ->> 'order_id' = $1::text
                  OR b.payment_details::jsonb ->> 'razorpay_order_id' = $1::text
                )
                ELSE false
              END
            )
            ELSE false
          END
         FOR UPDATE`,
        [bookingId, body.booking_id]
      );

      logger.info('Booking lock query result:', {
        rowCount: bookingLockResult?.rowCount ?? 0,
        bookingId,
        booking_uuid: body.booking_id,
        hasRows: (bookingLockResult?.rowCount ?? 0) > 0,
        searchCriteria: {
          bookingId,
          booking_uuid: body.booking_id,
          userId,
          types: {
            bookingId: typeof bookingId,
            booking_uuid: typeof body.booking_id
          }
        }
      });

      if (!bookingLockResult?.rowCount) {
        // Log the actual value we're searching for
        logger.error('Booking not found during lock', {
          searchValue: bookingId,
          booking_uuid: body.booking_id,
          userId,
          payment_reference,
          searchTypes: {
            bookingId: typeof bookingId,
            booking_uuid: typeof body.booking_id,
            booking_uuid_length: body.booking_id?.length
          }
        });

        // Try to find any booking with similar payment details for debugging
        const debugResult = await query(
          `SELECT 
             booking_id, 
             id, 
             status,
             payment_status,
             user_id,
             CASE 
               WHEN payment_details IS NOT NULL 
               THEN CASE 
                 WHEN jsonb_typeof(COALESCE(payment_details::jsonb, '{}'::jsonb)) = 'object'
                 THEN payment_details::jsonb
                 ELSE NULL
               END
               ELSE NULL
             END as payment_details,
             created_at 
           FROM bookings 
           WHERE (user_id = $1::uuid 
           OR id = $2::uuid)
           AND created_at > NOW() - interval '1 day'
           ORDER BY created_at DESC`,
          [userId, body.booking_id]
        );

        if ((debugResult?.rowCount ?? 0) > 0) {
          logger.error('Debug - Recent bookings found:', {
            bookingsCount: debugResult?.rowCount ?? 0,
            bookings: debugResult.rows.map((row: {
              booking_id: string;
              id: string;
              status: string;
              payment_status: string;
              user_id: string;
              payment_details: any;
              created_at: string | Date;
            }) => ({
              ...row,
              payment_details: row.payment_details ? JSON.stringify(row.payment_details) : null,
              created_at_formatted: new Date(row.created_at).toISOString()
            }))
          });
        } else {
          logger.error('No recent bookings found for user', {
            userId,
            searchValue: bookingId
          });
        }

        // Additional debug query to check raw payment_details
        const rawDebugResult = await query(
          `SELECT booking_id, id, payment_details::text 
           FROM bookings 
           WHERE user_id = $1::uuid 
           AND payment_details IS NOT NULL 
           ORDER BY created_at DESC 
           LIMIT 5`,
          [userId]
        );

        if ((rawDebugResult?.rowCount ?? 0) > 0) {
          logger.error('Raw payment details from recent bookings:', {
            rawBookings: rawDebugResult.rows
          });
        }

        throw new Error('Booking not found');
      }

      const booking = bookingLockResult.rows[0];
      logger.info('Booking found:', {
        bookingId: booking.id,
        booking_id: booking.booking_id,
        payment_details: booking.payment_details ?
          JSON.stringify(typeof booking.payment_details === 'string' ?
            JSON.parse(booking.payment_details) : booking.payment_details) : null,
        total_price: booking.total_price
      });

      const amount = booking.total_price;

      if (!amount) {
        logger.error('Booking amount not found', { bookingId, booking });
        throw new Error('Booking amount not found');
      }

      // Update booking payment status and details
      await query(
        `UPDATE bookings 
         SET payment_status = 'completed',
             status = 'confirmed',
             payment_reference = $1::text,
             payment_details = $2::jsonb,
             updated_at = NOW(),
             booking_id = COALESCE(booking_id, $3::text)
         WHERE id = $4::uuid`,
        [
          payment_reference,
          JSON.stringify(body),
          `OR${booking.id.slice(0, 3)}`,
          booking.id
        ]
      );

      // Create a record in the payments table for financial reporting
      try {
        await query(
          `INSERT INTO payments (
            id,
            booking_id,
            amount,
            status,
            method,
            reference,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          [
            crypto.randomUUID(),
            booking.id,
            amount,
            'completed',
            body.payment_method || 'online',
            payment_reference
          ]
        );
        logger.info('Payment record created successfully during verification', {
          bookingId: booking.id,
          amount,
          reference: payment_reference
        });
      } catch (payError) {
        logger.error('Failed to create payment record during verification:', payError);
        // We don't fail the verification if the audit log fails
      }

      logger.info('Payment status updated successfully', {
        bookingId: booking.id,
        payment_reference,
        status: 'confirmed',
        payment_status: 'completed',
        booking_id: `OR${booking.id.slice(0, 3)}`
      });

      // Commit transaction
      await query('COMMIT');

      // Verify email configuration
      const isEmailConfigValid = await verifyEmailConfig();

      if (!isEmailConfigValid) {
        logger.error('Email configuration is invalid', {
          smtp_user: process.env.SMTP_USER,
          smtp_from: process.env.SMTP_FROM
        });
      }

      // Send confirmation email regardless of config verification
      // (we'll log errors but not fail the transaction)
      const emailBooking = {
        ...booking,
        id: bookingId,
        displayId: booking.booking_id || `#${booking.id.slice(0, 4)}`,
        total_amount: amount,
        vehicle: {
          name: booking.vehicle_name
        },
        payment_reference,
        payment_status: 'completed',
        status: 'confirmed',
        startDate: formatDate(booking.start_date),
        endDate: formatDate(booking.end_date),
        pickupLocation: booking.pickup_location,
        totalPrice: `₹${parseFloat(booking.total_price || 0).toFixed(2)}`
      };

      // Add the email sending function
      const sendEmailConfirmation = async (booking: any, userEmail: string) => {
        try {
          logger.info('Attempting to send booking confirmation email', {
            bookingId: booking.booking_id || booking.id,
            email: userEmail
          });

          const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
          const emailEndpoint = `${appUrl}/api/email/send`;

          logger.debug('Using email endpoint', { endpoint: emailEndpoint });

          const emailPayload = {
            type: 'booking-confirmation',
            data: {
              email: userEmail,
              name: booking.user_name || 'User',
              bookingId: booking.booking_id || booking.id,
              startDate: formatDate(booking.start_date),
              endDate: formatDate(booking.end_date),
              vehicleName: booking.vehicle_name,
              amount: `₹${parseFloat(booking.total_price || 0).toFixed(2)}`,
              paymentId: payment_reference
            }
          };

          logger.debug('Email payload prepared', { payload: emailPayload });

          const response = await fetch(emailEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(emailPayload)
          });

          const responseData = await response.json();

          if (!response.ok) {
            throw new Error(`Failed to send email confirmation: ${response.status} ${response.statusText} - ${JSON.stringify(responseData)}`);
          }

          logger.info('Email confirmation request successful', {
            status: response.status,
            response: responseData
          });

          return true;
        } catch (error) {
          logger.error('Failed to send payment verification email confirmation:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : null,
            bookingId: booking.booking_id || booking.id,
            email: userEmail
          });

          // Continue the process even if email fails
          return false;
        }
      };

      // Replace the direct email call with the new function
      const emailSent = await sendEmailConfirmation(booking, booking.user_email || session.user.email);

      logger.info('Payment verification completed successfully', {
        bookingId,
        payment_reference,
        email_sent: emailSent
      });

      // Send notification to admins
      try {
        const adminNotificationService = AdminNotificationService.getInstance();
        await adminNotificationService.sendPaymentNotification({
          booking_id: bookingId,
          payment_id: payment_reference,
          user_name: booking.user_name,
          amount: booking.total_price,
          payment_method: booking.payment_method || 'Online',
          status: 'success',
          transaction_time: new Date()
        });

        logger.info('Admin payment notification sent successfully');
      } catch (adminNotifyError) {
        logger.error('Failed to send admin payment notification:', adminNotifyError);
      }

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully'
      });

    } catch (error) {
      await query('ROLLBACK');
      logger.error('Payment verification transaction error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        bookingId,
        payment_reference
      });
      throw error;
    }
  } catch (error) {
    logger.error('Payment verification error:', {
      error: error instanceof Error ? error.message : 'Unknown error'
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