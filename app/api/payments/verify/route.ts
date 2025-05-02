import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import logger from '@/lib/logger';
import crypto from 'crypto';
import Razorpay from 'razorpay';

// Configure API behavior
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Initialize Prisma client
const prisma = new PrismaClient({
  log: ['error', 'warn']
});

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Options request handler
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// Health check endpoint
export async function GET() {
  const requestId = `health_${Date.now()}`;
  
  try {
    await prisma.$queryRaw`SELECT NOW()`;
    
    return NextResponse.json({
      success: true,
      message: 'Payment verification endpoint is healthy',
      timestamp: new Date().toISOString(),
      requestId
    }, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    logger.error('Health check failed:', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json({
      success: false,
      error: 'Service unavailable',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      requestId
    }, {
      status: 503,
      headers: {
        ...corsHeaders,
        'Cache-Control': 'no-store'
      }
    });
  }
}

// Payment verification endpoint
export async function POST(request: NextRequest) {
  const requestId = `verify_${Date.now()}`;
  
  try {
    // Parse request body
    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, booking_id } = body;

    // Log received data
    logger.info('Payment verification request received:', {
      requestId,
      bookingId: booking_id,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      signature: razorpay_signature?.substring(0, 10) + '...'
    });

    // Validate required fields
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !booking_id) {
      const missingFields = [];
      if (!razorpay_payment_id) missingFields.push('razorpay_payment_id');
      if (!razorpay_order_id) missingFields.push('razorpay_order_id');
      if (!razorpay_signature) missingFields.push('razorpay_signature');
      if (!booking_id) missingFields.push('booking_id');

      logger.error('Missing required fields:', {
        requestId,
        missingFields
      });

      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        details: `Missing: ${missingFields.join(', ')}`,
        timestamp: new Date().toISOString(),
        requestId
      }, { 
        status: 400,
        headers: corsHeaders
      });
    }

    try {
      // Find the booking first
      const booking = await prisma.bookings.findFirst({
        where: {
          booking_id: booking_id
        }
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      // Fetch payment details from Razorpay
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      logger.info('Razorpay payment details:', {
        requestId,
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        orderId: payment.order_id
      });

      // Verify that the order ID matches
      if (payment.order_id !== razorpay_order_id) {
        throw new Error('Order ID mismatch');
      }

      // Create signature verification string
      const secret = process.env.RAZORPAY_KEY_SECRET!;
      const hmac = crypto.createHmac('sha256', secret);
      const generated_signature = hmac
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

      logger.info('Signature verification details:', {
        requestId,
        signatureMatch: generated_signature === razorpay_signature,
        generatedSignaturePrefix: generated_signature.substring(0, 10) + '...',
        receivedSignaturePrefix: razorpay_signature.substring(0, 10) + '...'
      });

      if (generated_signature !== razorpay_signature) {
        throw new Error('Invalid payment signature');
      }

      // Convert payment details to a string for storage
      const paymentDetailsString = JSON.stringify({
        razorpay_payment_id,
        razorpay_order_id,
        razorpay_signature,
        payment_status: payment.status,
        amount_paid: Number(payment.amount) / 100,
        currency: payment.currency,
        payment_method: payment.method,
        payment_email: payment.email,
        payment_contact: payment.contact,
        payment_completed_at: new Date().toISOString()
      });

      // Update booking with payment details
      const updatedBooking = await prisma.bookings.update({
        where: { id: booking.id },
        data: {
          payment_status: payment.status === 'captured' ? 'paid' : 'failed',
          status: payment.status === 'captured' ? 'confirmed' : 'payment_failed',
          payment_details: paymentDetailsString // Store as string
        }
      });

      logger.info('Booking updated successfully:', {
        requestId,
        bookingId: booking_id,
        status: updatedBooking.status,
        paymentStatus: updatedBooking.payment_status
      });

      return NextResponse.json({
        success: true,
        booking: updatedBooking,
        timestamp: new Date().toISOString(),
        requestId
      }, { 
        status: 200,
        headers: corsHeaders
      });

    } catch (verificationError) {
      logger.error('Payment verification error:', {
        requestId,
        error: verificationError instanceof Error ? verificationError.message : 'Unknown error',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      });

      // Find the booking for failed state update
      const booking = await prisma.bookings.findFirst({
        where: {
          booking_id: booking_id
        }
      });

      if (booking) {
        // Convert failed payment details to string
        const failedPaymentDetailsString = JSON.stringify({
          error: verificationError instanceof Error ? verificationError.message : 'Unknown error',
          razorpay_payment_id,
          razorpay_order_id,
          razorpay_signature,
          verification_failed: true,
          failed_at: new Date().toISOString()
        });

        // Update booking to failed state
        await prisma.bookings.update({
          where: { id: booking.id },
          data: {
            payment_status: 'failed',
            status: 'payment_failed',
            payment_details: failedPaymentDetailsString // Store as string
          }
        });
      }

      return NextResponse.json({
        success: false,
        error: 'Payment verification failed',
        details: verificationError instanceof Error ? verificationError.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId
      }, { 
        status: 400,
        headers: corsHeaders
      });
    }

  } catch (error) {
    logger.error('Payment verification failed:', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Payment verification failed',
      timestamp: new Date().toISOString(),
      requestId
    }, { 
      status: 500,
      headers: corsHeaders
    });
  }
} 