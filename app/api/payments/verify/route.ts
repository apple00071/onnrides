import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { validatePaymentVerification } from '@/lib/razorpay';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Define error interface for better error handling
interface PaymentError extends Error {
  code?: string;
  details?: unknown;
}

// Type guard for PaymentError
function isPaymentError(error: unknown): error is PaymentError {
  return error instanceof Error;
}

// CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({
        success: false,
        error: 'Missing required payment verification fields'
      }, { status: 400 });
    }

    // Find the booking using direct database query
    logger.info('Looking for booking with order ID:', { razorpay_order_id });

    const bookingResult = await query(`
      SELECT * FROM bookings 
      WHERE "paymentDetails"->>'razorpay_order_id' = $1
         OR "paymentDetails"->>'order_id' = $1
      LIMIT 1
    `, [razorpay_order_id]);

    // Handle case when booking is not found
    if (bookingResult.rows.length === 0) {
      logger.error('Booking not found for payment verification:', { razorpay_order_id });

      // Log recent bookings for debugging
      const recentBookingsResult = await query(`
        SELECT id, "bookingId", "paymentDetails" 
        FROM bookings 
        WHERE "paymentDetails" IS NOT NULL 
        ORDER BY "createdAt" DESC 
        LIMIT 5
      `, []);

      logger.info('Recent bookings with payment details:', {
        count: recentBookingsResult.rows.length,
        bookings: recentBookingsResult.rows
      });

      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 });
    }

    // Extract the booking from the result
    const bookingData = bookingResult.rows[0];

    // Verify payment signature
    try {
      const isValid = validatePaymentVerification({
        order_id: razorpay_order_id,
        payment_id: razorpay_payment_id,
        signature: razorpay_signature
      });

      if (!isValid) {
        throw new Error('Invalid payment signature');
      }

      // Update booking with payment verification details using direct query
      const updatedBookingResult = await query(`
        UPDATE bookings
        SET "paymentDetails" = jsonb_set(
          COALESCE("paymentDetails", '{}'::jsonb),
          '{razorpay_payment_id}',
          to_jsonb($1::text)
        ) || jsonb_build_object(
          'razorpay_signature', $2::text,
          'verified_at', $3::text,
          'status', 'verified'
        ),
        "paymentStatus" = 'completed',
        status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END,
        "updatedAt" = $4
        WHERE id = $5
        RETURNING id, "bookingId"
      `, [
        razorpay_payment_id,
        razorpay_signature,
        new Date().toISOString(),
        new Date(),
        bookingData.id
      ]);

      const updatedBooking = updatedBookingResult.rows[0];

      return NextResponse.json({
        success: true,
        booking_id: updatedBooking.bookingId
      });

    } catch (error) {
      // Handle verification failure
      await query(`
        UPDATE bookings
        SET "paymentDetails" = jsonb_set(
          COALESCE("paymentDetails", '{}'::jsonb),
          '{razorpay_payment_id}',
          to_jsonb($1::text)
        ) || jsonb_build_object(
          'razorpay_signature', $2::text,
          'failed_at', $3::text,
          'status', 'failed',
          'error', $4::text
        ),
        "paymentStatus" = 'pending',
        "updatedAt" = $5
        WHERE id = $6
      `, [
        razorpay_payment_id,
        razorpay_signature,
        new Date().toISOString(),
        error instanceof Error ? error.message : 'Payment verification failed',
        new Date(),
        bookingData.id
      ]);

      throw error;
    }
  } catch (error) {
    logger.error('Payment verification error:', error);
    
    return NextResponse.json({
      success: false,
      error: isPaymentError(error) ? error.message : 'Payment verification failed'
    }, { status: 400 });
  }
} 