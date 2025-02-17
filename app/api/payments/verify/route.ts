import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { EmailService } from '@/lib/email/service';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { QueryResult } from 'pg';
import { WhatsAppService } from '@/lib/whatsapp/service';

// Set timeout for the API route
export const maxDuration = 30; // 30 seconds timeout
export const dynamic = 'force-dynamic';

// Define admin notification recipients
const ADMIN_EMAILS = ['contact@onnrides.com', 'onnrides@gmail.com'];
const ADMIN_PHONES = ['8247494622', '9182495481'];

// Helper function to format date in IST with proper conversion
function formatDateIST(date: Date | string): string {
  // Convert string date to Date object if needed
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Add 5 hours and 30 minutes for IST conversion
  const istDate = new Date(dateObj.getTime() + (5.5 * 60 * 60 * 1000));
  
  return istDate.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Helper function to format time only in IST
function formatTimeIST(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const istDate = new Date(dateObj.getTime() + (5.5 * 60 * 60 * 1000));
  
  return istDate.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Helper function to format date only in IST
function formatShortDateIST(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const istDate = new Date(dateObj.getTime() + (5.5 * 60 * 60 * 1000));
  
  return istDate.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
}

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
  pickup_location: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json();
    
    logger.info('Payment verification request received:', {
      orderId: body.razorpay_order_id,
      paymentId: body.razorpay_payment_id,
      bookingId: body.booking_id
    });

    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      booking_id 
    } = body;

    // Validate required fields
    const missingFields = [];
    if (!razorpay_order_id) missingFields.push('razorpay_order_id');
    if (!razorpay_payment_id) missingFields.push('razorpay_payment_id');
    if (!razorpay_signature) missingFields.push('razorpay_signature');
    if (!booking_id) missingFields.push('booking_id');

    if (missingFields.length > 0) {
      logger.error('Missing required fields:', { missingFields });
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          details: `The following fields are required: ${missingFields.join(', ')}`,
          code: 'MISSING_FIELDS'
        },
        { status: 400 }
      );
    }

    // Get booking details with error handling
    let bookingResult;
    try {
      bookingResult = await query(
        `SELECT b.*, u.name as user_name, u.phone as user_phone, u.email as user_email, v.name as vehicle_name
         FROM bookings b
         JOIN users u ON b.user_id = u.id
         JOIN vehicles v ON b.vehicle_id = v.id
         WHERE b.id = $1`,
        [booking_id]
      );
    } catch (dbError) {
      logger.error('Database error fetching booking:', dbError);
      return NextResponse.json(
        {
          success: false,
          error: 'Database error',
          details: 'Failed to fetch booking details',
          code: 'DB_ERROR'
        },
        { status: 500 }
      );
    }

    if (!bookingResult.rows.length) {
      logger.error('Booking not found:', { booking_id });
      return NextResponse.json(
        {
          success: false,
          error: 'Booking not found',
          details: 'The booking associated with this payment could not be found',
          code: 'BOOKING_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    const booking = bookingResult.rows[0];

    // Check if payment is already verified
    if (booking.payment_status === 'completed') {
      logger.warn('Payment already verified:', { booking_id });
      return NextResponse.json({
        success: true,
        data: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          booking: {
            id: booking.id,
            booking_id: booking.booking_id,
            status: booking.status,
            payment_status: booking.payment_status
          }
        },
        message: 'Payment was already verified'
      });
    }

    // Verify payment signature
    const secretKey = process.env.RAZORPAY_KEY_SECRET;
    if (!secretKey) {
      logger.error('Razorpay secret key not configured');
      return NextResponse.json(
        {
          success: false,
          error: 'Configuration error',
          details: 'Payment verification is not properly configured',
          code: 'CONFIG_ERROR'
        },
        { status: 500 }
      );
    }

    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', secretKey)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      logger.error('Invalid payment signature', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid signature',
          details: 'Payment verification failed - signature mismatch',
          code: 'INVALID_SIGNATURE'
        },
        { status: 400 }
      );
    }

    // Update booking status within transaction
    await query('BEGIN');
    try {
      const paymentDetails = {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        verified_at: new Date().toISOString()
      };

      const updateResult = await query(
        `UPDATE bookings 
         SET status = 'confirmed',
             payment_status = 'completed',
             payment_details = $1::jsonb,
             updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [JSON.stringify(paymentDetails), booking_id]
      );

      await query('COMMIT');

      // Send notifications
      try {
        const emailService = EmailService.getInstance();
        const whatsappService = WhatsAppService.getInstance();

        // Format amount and dates for notifications
        const formattedAmount = formatCurrency(booking.total_price);
        const startDate = formatDateIST(booking.start_date);
        const endDate = formatDateIST(booking.end_date);
        const startTime = formatTimeIST(booking.start_date);
        const endTime = formatTimeIST(booking.end_date);
        const bookingDate = formatShortDateIST(booking.start_date);

        // Send email notification
        await emailService.sendBookingConfirmation(
          booking.user_email,
          {
            userName: booking.user_name,
            vehicleName: booking.vehicle_name,
            bookingId: booking.booking_id,
            startDate: startDate,
            endDate: endDate,
            amount: formattedAmount,
            paymentId: razorpay_payment_id
          }
        ).catch(error => {
          logger.error('Failed to send confirmation email:', error);
        });

        // Send WhatsApp notification with clearer time format
        await whatsappService.sendMessage(
          booking.user_phone,
          `🎉 Booking Confirmed!\n\n` +
          `Hello ${booking.user_name}!\n\n` +
          `Your booking for ${booking.vehicle_name} has been confirmed.\n\n` +
          `📅 Date: ${bookingDate}\n` +
          `⏰ Time: ${startTime} to ${endTime}\n` +
          `📍 Location: ${booking.pickup_location}\n` +
          `💰 Amount: ${formattedAmount}\n` +
          `🆔 Booking ID: ${booking.booking_id}\n\n` +
          `Thank you for choosing OnnRides! Drive safe! 🚗`
        ).catch(error => {
          logger.error('Failed to send WhatsApp notification:', error);
        });

        // Send admin notifications
        await Promise.all([
          // Admin emails
          ...ADMIN_EMAILS.map(email =>
            emailService.sendEmail(
              email,
              'New Booking Confirmed!',
              `
              <h1>New Booking Confirmed!</h1>
              <p>A new booking has been confirmed on OnnRides.</p>
              <h2>Booking Details:</h2>
              <ul>
                <li><strong>Booking ID:</strong> ${booking.booking_id}</li>
                <li><strong>Customer:</strong> ${booking.user_name}</li>
                <li><strong>Phone:</strong> ${booking.user_phone}</li>
                <li><strong>Vehicle:</strong> ${booking.vehicle_name}</li>
                <li><strong>Location:</strong> ${booking.pickup_location}</li>
                <li><strong>Date:</strong> ${bookingDate}</li>
                <li><strong>Time:</strong> ${startTime} to ${endTime}</li>
                <li><strong>Amount:</strong> ${formattedAmount}</li>
                <li><strong>Payment ID:</strong> ${razorpay_payment_id}</li>
              </ul>
              `
            ).catch(error => {
              logger.error('Failed to send admin email:', error);
            })
          ),

          // Admin WhatsApp messages
          ...ADMIN_PHONES.map(phone =>
            whatsappService.sendMessage(
              phone,
              `🎉 New Booking Confirmed!\n\n` +
              `Booking Details:\n` +
              `ID: ${booking.booking_id}\n` +
              `Customer: ${booking.user_name}\n` +
              `Phone: ${booking.user_phone}\n` +
              `Vehicle: ${booking.vehicle_name}\n` +
              `Location: ${booking.pickup_location}\n` +
              `Date: ${bookingDate}\n` +
              `Time: ${startTime} to ${endTime}\n` +
              `Amount: ${formattedAmount}\n` +
              `Payment ID: ${razorpay_payment_id}`
            ).catch(error => {
              logger.error('Failed to send admin WhatsApp:', error);
            })
          )
        ]);

        logger.info('Notifications sent successfully:', {
          bookingId: booking.booking_id,
          email: booking.user_email,
          phone: booking.user_phone
        });
      } catch (notificationError) {
        logger.error('Error sending notifications:', notificationError);
        // Don't throw error here - payment was successful
      }

      // Return success response with consistent structure
      return NextResponse.json({
        success: true,
        data: {
          orderId: razorpay_order_id,
          paymentId: razorpay_payment_id,
          booking: {
            id: booking.id,
            booking_id: booking.booking_id,
            status: 'confirmed',
            payment_status: 'completed',
            amount: booking.total_price,
            currency: 'INR'
          }
        },
        message: 'Payment successful and booking confirmed'
      });
    } catch (error) {
      await query('ROLLBACK');
      logger.error('Error updating booking:', error);
      throw error;
    }
  } catch (error) {
    logger.error('Payment verification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Payment verification failed',
        details: error instanceof Error ? error.message : 'An unexpected error occurred',
        code: 'VERIFICATION_ERROR'
      },
      { status: 500 }
    );
  }
} 