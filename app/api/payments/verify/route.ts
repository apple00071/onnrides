import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';
import { validatePaymentVerification } from '@/lib/razorpay';

const prisma = new PrismaClient();

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

    // Find the booking using Prisma
    logger.info('Looking for booking with order ID:', { razorpay_order_id });

    // Use a raw SQL query through Prisma to find bookings with the given order ID in payment_details
    const booking = await prisma.$queryRaw`
      SELECT * FROM bookings 
      WHERE payment_details->>'razorpay_order_id' = ${razorpay_order_id}
      LIMIT 1
    `;

    // Handle case when booking is not found or is an empty array
    if (!booking || (Array.isArray(booking) && booking.length === 0)) {
      logger.error('Booking not found for payment verification:', { razorpay_order_id });

      // Log recent bookings for debugging using raw query
      const recentBookings = await prisma.$queryRaw`
        SELECT id, booking_id, payment_details 
        FROM bookings 
        WHERE payment_details IS NOT NULL 
        ORDER BY created_at DESC 
        LIMIT 5
      `;

      logger.info('Recent bookings with payment details:', {
        count: Array.isArray(recentBookings) ? recentBookings.length : 0,
        bookings: recentBookings
      });

      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 });
    }

    // Extract the booking from the result array if needed
    const bookingData = Array.isArray(booking) ? booking[0] : booking;

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

      // Update booking with payment verification details using Prisma
      const updatedBooking = await prisma.bookings.update({
        where: { id: bookingData.id },
        data: {
          payment_details: {
            ...bookingData.payment_details as any,
            razorpay_payment_id,
            razorpay_signature,
            verified_at: new Date().toISOString(),
            status: 'verified'
          },
          payment_status: 'completed',
          status: bookingData.status === 'pending' ? 'confirmed' : bookingData.status,
          updated_at: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        booking_id: updatedBooking.booking_id
      });

    } catch (error) {
      // Handle verification failure using Prisma
      await prisma.bookings.update({
        where: { id: bookingData.id },
        data: {
          payment_details: {
            ...bookingData.payment_details as any,
            razorpay_payment_id,
            razorpay_signature,
            failed_at: new Date().toISOString(),
            status: 'failed',
            error: error instanceof Error ? error.message : 'Payment verification failed'
          },
          payment_status: 'pending',
          updated_at: new Date()
        }
      });

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