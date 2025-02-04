import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import Razorpay from 'razorpay';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || '',
  key_secret: process.env.RAZORPAY_KEY_SECRET || ''
});

// Import Razorpay utils for verification
const { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');

// Helper function to verify Razorpay signature
const verifySignature = (orderId: string, paymentId: string, signature: string) => {
  try {
    // Use Razorpay's official validation utility
    return validatePaymentVerification(
      { "order_id": orderId, "payment_id": paymentId },
      signature,
      process.env.RAZORPAY_KEY_SECRET || ''
    );
  } catch (error) {
    logger.error('Signature verification failed:', error);
    return false;
  }
};

// Helper function to get CORS headers
const getCorsHeaders = (origin: string | null) => {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(null),
  });
}

// Helper function to find booking
async function findBooking(orderId: string, bookingId?: string) {
  try {
    logger.info('Finding booking with:', { orderId, bookingId });
    
    let result;
    if (bookingId) {
      // Try to find by booking ID first
      result = await query(
        `SELECT id, status, payment_status, payment_details 
         FROM bookings 
         WHERE id = $1`,
        [bookingId]
      );
      logger.info('Search by booking ID result:', { 
        found: result?.rows?.length > 0,
        bookingId,
        result: result?.rows?.[0] 
      });
    }
    
    if (!result?.rows?.length) {
      // If no booking found by ID, try to find by order ID in payment_details
      result = await query(
        `SELECT id, status, payment_status, payment_details 
         FROM bookings 
         WHERE (payment_details)::jsonb->>'razorpay_order_id' = $1
         OR (payment_details)::jsonb->>'order_id' = $1
         OR id IN (
           SELECT id FROM bookings 
           WHERE status = 'pending' 
           AND created_at > NOW() - INTERVAL '1 hour'
           ORDER BY created_at DESC 
           LIMIT 1
         )
         ORDER BY created_at DESC 
         LIMIT 1`,
        [orderId]
      );
      logger.info('Search by order ID or recent pending result:', { 
        found: result?.rows?.length > 0,
        orderId,
        result: result?.rows?.[0]
      });
    }

    if (!result?.rows?.length) {
      logger.error('No booking found with any method');
      return null;
    }

    logger.info('Found booking:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    logger.error('Error finding booking:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      orderId,
      bookingId
    });
    throw error;
  }
}

// Helper function to verify Cashfree payment
async function verifyCashfreePayment(orderId: string, orderToken: string) {
  try {
    const response = await fetch(`https://api.cashfree.com/pg/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'x-client-id': process.env.CASHFREE_APP_ID!,
        'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
        'x-api-version': '2022-09-01'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to verify payment with Cashfree');
    }

    const data = await response.json();
    logger.info('Cashfree payment status:', data);

    return {
      success: data.order_status === 'PAID',
      data
    };
  } catch (error) {
    logger.error('Cashfree verification error:', error);
    throw error;
  }
}

// Helper function to update booking
async function updateBooking(bookingId: string, paymentDetails: any) {
  try {
    const result = await query(
      `UPDATE bookings 
       SET status = $1,
           payment_status = $2,
           payment_details = payment_details || $3::jsonb,
           updated_at = NOW()
       WHERE id = $4 
       RETURNING id, status, payment_status, payment_details`,
      [
        'confirmed',
        'completed',
        JSON.stringify({
          payment_completed_at: new Date().toISOString(),
          cashfree_payment_details: paymentDetails
        }),
        bookingId
      ]
    );

    if (result.rowCount === 0) {
      throw new Error('No booking found to update');
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to update booking:', error);
    throw error;
  }
}

// Helper function to handle Razorpay API calls with retry
async function handleRazorpayRequest(requestFn: () => Promise<any>, maxRetries = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await requestFn();
    } catch (error: any) {
      lastError = error;
      
      // Log the error
      logger.error('Razorpay API error:', {
        attempt,
        error: error instanceof Error ? error.message : 'Unknown error',
        status: error.statusCode
      });

      // If it's a rate limit error (429), wait before retrying
      if (error.statusCode === 429) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 8000); // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      // For other errors, throw immediately
      throw error;
    }
  }
  throw lastError;
}

export async function POST(request: NextRequest) {
  try {
    const responseHeaders = getCorsHeaders(request.headers.get('origin'));

    // Get request body
    const body = await request.json();
    logger.info('Payment verification request received:', body);

    const { order_id, order_token, booking_id } = body;

    if (!order_id || !order_token) {
      return NextResponse.json(
        { error: 'Missing payment details' },
        { status: 400, headers: responseHeaders }
      );
    }

    // Verify payment with Cashfree
    const verificationResult = await verifyCashfreePayment(order_id, order_token);
    
    if (!verificationResult.success) {
      return NextResponse.json({
        error: 'Payment verification failed',
        status: verificationResult.data.order_status,
        message: 'Payment was not successful'
      }, { 
        status: 400,
        headers: responseHeaders
      });
    }

    // Update booking status
    try {
      const updatedBooking = await updateBooking(booking_id, verificationResult.data);

      logger.info('Payment verification completed successfully:', {
        bookingId: updatedBooking.id,
        status: updatedBooking.status,
        paymentStatus: updatedBooking.payment_status
      });

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          bookingId: updatedBooking.id,
          status: updatedBooking.status
        }
      }, { headers: responseHeaders });

    } catch (updateError) {
      logger.error('Error updating booking:', {
        error: updateError instanceof Error ? updateError.message : 'Unknown error',
        stack: updateError instanceof Error ? updateError.stack : undefined,
        bookingId: booking_id,
        orderId: order_id
      });

      return NextResponse.json({
        error: updateError instanceof Error ? updateError.message : 'Failed to update booking',
        details: {
          bookingId: booking_id,
          orderId: order_id
        }
      }, { status: 500, headers: responseHeaders });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error('Payment verification failed:', {
      error: errorMessage,
      stack: errorStack,
      request: {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries())
      }
    });

    return NextResponse.json({
      error: errorMessage,
      message: 'Payment verification failed. Please try again or contact support.'
    }, { 
      status: 500, 
      headers: getCorsHeaders(null)
    });
  }
} 