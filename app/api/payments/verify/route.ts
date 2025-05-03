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

    const booking = await prisma.booking.findFirst({
      where: {
        paymentDetails: {
          path: ['razorpay_order_id'],
          equals: razorpay_order_id
        }
      }
    });

    if (!booking) {
      logger.error('Booking not found for payment verification:', { razorpay_order_id });

      // Log recent bookings for debugging
      const recentBookings = await prisma.booking.findMany({
        where: {
          NOT: {
            paymentDetails: null
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 5,
        select: {
          id: true,
          bookingId: true,
          paymentDetails: true
        }
      });

      logger.info('Recent bookings with payment details:', {
        count: recentBookings.length,
        bookings: recentBookings
      });

      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 });
    }

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
      const updatedBooking = await prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentDetails: {
            ...booking.paymentDetails as any,
            razorpay_payment_id,
            razorpay_signature,
            verified_at: new Date().toISOString(),
            status: 'verified'
          },
          paymentStatus: 'completed',
          status: booking.status === 'pending' ? 'confirmed' : booking.status,
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        booking_id: updatedBooking.bookingId
      });

    } catch (error) {
      // Handle verification failure using Prisma
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          paymentDetails: {
            ...booking.paymentDetails as any,
            razorpay_payment_id,
            razorpay_signature,
            failed_at: new Date().toISOString(),
            status: 'failed',
            error: error instanceof Error ? error.message : 'Payment verification failed'
          },
          paymentStatus: 'pending',
          updatedAt: new Date()
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