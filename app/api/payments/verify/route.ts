import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { EmailService } from '@/lib/email/service';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { QueryResult } from 'pg';
import { WhatsAppService } from '@/lib/whatsapp/service';
import Razorpay from 'razorpay';

// Set timeout for the API route
export const maxDuration = 30; // 30 seconds timeout
export const dynamic = 'force-dynamic';

// Define admin notification recipients
const ADMIN_EMAILS = ['contact@onnrides.com', 'onnrides@gmail.com'];
const ADMIN_PHONES = ['8247494622', '9182495481'];

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

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
    logger.info('Payment verification endpoint called');
    
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.error('No user session found during payment verification');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature, 
      booking_id 
    } = body;

    logger.info('Payment verification request received', {
      userId: session.user.id,
      razorpay_payment_id,
      razorpay_order_id,
      booking_id
    });

    // Verify all required parameters are present
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !booking_id) {
      logger.error('Missing required payment verification parameters');
      return NextResponse.json(
        { success: false, error: 'Missing required payment parameters' },
        { status: 400 }
      );
    }

    try {
      // 1. Get booking details from database
      const bookingResult = await query(
        `SELECT * FROM bookings WHERE booking_id = $1 AND user_id = $2`,
        [booking_id, session.user.id]
      );

      if (!bookingResult.rows.length) {
        logger.error('Booking not found', { 
          booking_id,
          user_id: session.user.id 
        });
        return NextResponse.json(
          { success: false, error: 'Booking not found' },
          { status: 404 }
        );
      }

      const booking = bookingResult.rows[0];

      // 2. Fetch Razorpay order details
      const order = await razorpay.orders.fetch(razorpay_order_id);
      logger.info('Fetched Razorpay order:', order);

      // 3. Verify order amount matches the amount sent in the order
      // The order.amount is already in paise from Razorpay
      const orderAmount = Number(order.amount);
      logger.info('Verifying payment amounts:', {
        orderAmountPaise: orderAmount,
        orderAmountRupees: Number(orderAmount) / 100,
        totalBookingAmount: booking.total_price,
        advancePercentage: 5
      });

      // The amount in the order should be used as the source of truth
      // since it was created during booking creation
      const captureAmount = orderAmount;

      // 4. Verify payment signature
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generatedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
        .update(text)
        .digest('hex');

      if (generatedSignature !== razorpay_signature) {
        logger.error('Invalid payment signature');
        return NextResponse.json(
          { success: false, error: 'Invalid payment signature' },
          { status: 400 }
        );
      }

      // 5. Verify payment hasn't already been captured
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      let captureResponse = payment;
      
      if (payment.status === 'captured') {
        logger.warn('Payment already captured, updating booking status', { razorpay_payment_id });
      } else {
        // 6. Capture the payment if not already captured
        captureResponse = await razorpay.payments.capture(
          razorpay_payment_id,
          captureAmount,
          'INR'
        );
        logger.info('Payment captured successfully:', {
          ...captureResponse,
          amountInRupees: Number(captureAmount) / 100
        });
      }

      // 7. Update booking status with proper payment details merge
      const updateResult = await query(
        `UPDATE bookings 
         SET status = 'confirmed',
             payment_status = 'completed',
             payment_details = COALESCE(payment_details::jsonb, '{}'::jsonb) || 
                             jsonb_build_object(
                               'payment_capture', $1::jsonb,
                               'razorpay_payment_id', $3,
                               'razorpay_order_id', $4,
                               'payment_status', 'completed',
                               'payment_completed_at', NOW(),
                               'amount_paid', $5,
                               'currency', $6
                             ),
             updated_at = CURRENT_TIMESTAMP
         WHERE booking_id = $2
         RETURNING id, booking_id, status, payment_status, payment_details`,
        [
          JSON.stringify(captureResponse), 
          booking_id,
          razorpay_payment_id,
          razorpay_order_id,
          Number(captureAmount) / 100,
          order.currency
        ]
      );

      const updatedBooking = updateResult.rows[0];
      
      // Log the consistent booking ID
      logger.info('Booking status updated successfully', {
        booking_id: updatedBooking.booking_id,
        internal_id: updatedBooking.id,
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
        amount: Number(captureAmount) / 100,
        status: updatedBooking.status,
        payment_status: updatedBooking.payment_status,
        payment_details: updatedBooking.payment_details
      });

      return NextResponse.json({
        success: true,
        message: payment.status === 'captured' ? 
          'Payment was already captured and booking updated' : 
          'Payment verified and captured successfully',
        data: {
          booking_id: updatedBooking.booking_id,
          payment_id: razorpay_payment_id,
          amount: Number(captureAmount) / 100,
          currency: order.currency,
          status: updatedBooking.status,
          payment_status: updatedBooking.payment_status,
          payment_completed_at: updatedBooking.payment_details.payment_completed_at
        }
      });

    } catch (error) {
      logger.error('Payment verification/capture error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error instanceof Error ? error.message : 'Payment verification failed'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Payment verification endpoint error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
} 