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

// Helper function to update booking
async function updateBooking(bookingId: string | undefined, paymentDetails: any) {
  try {
    // First find the booking
    const booking = await findBooking(paymentDetails.razorpay_order_id, bookingId);
    
    if (!booking) {
      logger.error('No booking found to update:', {
        providedBookingId: bookingId,
        orderId: paymentDetails.razorpay_order_id,
        paymentId: paymentDetails.razorpay_payment_id
      });
      throw new Error('No booking found');
    }

    // Log current booking state
    logger.info('Found booking to update:', {
      bookingId: booking.id,
      currentStatus: booking.status,
      currentPaymentStatus: booking.payment_status,
      paymentDetails: booking.payment_details
    });

    // Only update if not already confirmed
    if (booking.status === 'confirmed' && booking.payment_status === 'completed') {
      logger.info('Booking already confirmed:', booking);
      return booking;
    }

    // Merge existing payment details with new ones
    const existingDetails = typeof booking.payment_details === 'string' 
      ? JSON.parse(booking.payment_details) 
      : (booking.payment_details || {});
      
    const updatedDetails = {
      ...existingDetails,
      ...paymentDetails,
      verified_at: new Date().toISOString(),
      environment: process.env.NODE_ENV
    };

    const result = await query(
      `UPDATE bookings 
       SET status = 'confirmed',
           payment_status = 'completed',
           payment_details = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2 
       RETURNING id, status, payment_status, payment_details`,
      [JSON.stringify(updatedDetails), booking.id]
    );

    if (result.rowCount === 0) {
      logger.error('Failed to update booking:', {
        bookingId: booking.id,
        paymentDetails: updatedDetails
      });
      throw new Error('Failed to update booking');
    }

    logger.info('Booking updated successfully:', {
      bookingId: booking.id,
      newStatus: result.rows[0].status,
      newPaymentStatus: result.rows[0].payment_status,
      updatedDetails
    });
    
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
    logger.info('Payment verification request received:', {
      ...body,
      headers: Object.fromEntries(request.headers.entries())
    });

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_id
    } = body;

    // Log all input parameters
    logger.info('Processing payment verification:', {
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      bookingId: booking_id
    });

    // Handle QR code payments
    if (razorpay_order_id && !razorpay_payment_id) {
      try {
        logger.info('QR code payment detected, checking order status...');
        
        // Fetch order details from Razorpay with retry mechanism
        const order = await handleRazorpayRequest(
          () => razorpay.orders.fetch(razorpay_order_id)
        );
        logger.info('Razorpay order details:', order);

        if (order.status === 'paid') {
          // Get payment details for the order with retry mechanism
          const payments = await handleRazorpayRequest(
            () => razorpay.orders.fetchPayments(razorpay_order_id)
          );
          logger.info('Razorpay payments for order:', payments);
          
          if (payments.items && payments.items.length > 0) {
            const payment = payments.items[0];
            // Generate signature for the payment
            const signature = crypto
              .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
              .update(`${razorpay_order_id}|${payment.id}`)
              .digest('hex');

            try {
              // Update booking with QR payment details
              const updatedBooking = await updateBooking(booking_id, {
                razorpay_order_id,
                razorpay_payment_id: payment.id,
                razorpay_signature: signature,
                payment_method: 'qr',
                order_status: order.status,
                payment_time: new Date().toISOString()
              });

              logger.info('QR code payment verified successfully:', {
                bookingId: updatedBooking.id,
                status: updatedBooking.status,
                paymentStatus: updatedBooking.payment_status
              });

              return NextResponse.json({
                success: true,
                message: 'QR code payment verified successfully',
                data: {
                  bookingId: updatedBooking.id,
                  status: updatedBooking.status,
                  paymentId: payment.id
                }
              }, { headers: responseHeaders });
            } catch (updateError) {
              logger.error('Error updating booking for QR payment:', {
                error: updateError instanceof Error ? updateError.message : 'Unknown error',
                stack: updateError instanceof Error ? updateError.stack : undefined,
                orderId: razorpay_order_id,
                paymentId: payment.id
              });

              return NextResponse.json({
                error: 'Failed to update booking for QR payment',
                details: {
                  orderId: razorpay_order_id,
                  paymentId: payment.id
                }
              }, { status: 500, headers: responseHeaders });
            }
          }
        }
        
        // If order is not paid yet
        return NextResponse.json({
          error: 'Payment pending',
          status: order.status,
          message: 'Please complete the payment in your UPI app',
          retryAfter: 5 // Suggest client to retry after 5 seconds
        }, { 
          status: 202,
          headers: {
            ...responseHeaders,
            'Retry-After': '5'
          }
        });
      } catch (error: any) {
        // Handle specific Razorpay errors
        if (error.statusCode === 429) {
          return NextResponse.json({
            error: 'Too many requests',
            message: 'Please wait a moment before trying again',
            retryAfter: 30
          }, { 
            status: 429,
            headers: {
              ...responseHeaders,
              'Retry-After': '30'
            }
          });
        }

        logger.error('Error fetching Razorpay order:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          orderId: razorpay_order_id,
          statusCode: error.statusCode
        });

        return NextResponse.json({
          error: 'Failed to verify payment with Razorpay',
          message: 'Error checking payment status',
          retryAfter: 10
        }, { 
          status: error.statusCode || 500,
          headers: {
            ...responseHeaders,
            'Retry-After': '10'
          }
        });
      }
    }

    // For direct VPA payments
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      logger.error('Missing payment details:', { body });
      return NextResponse.json(
        { error: 'Missing payment details' },
        { status: 400, headers: responseHeaders }
      );
    }

    // Verify signature first
    const isValidSignature = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    logger.info('Signature verification result:', { 
      isValid: isValidSignature,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    });

    if (!isValidSignature) {
      logger.error('Invalid payment signature:', {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        signature: razorpay_signature
      });
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400, headers: responseHeaders }
      );
    }

    try {
      // Update booking
      const updatedBooking = await updateBooking(booking_id, {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_method: 'vpa',
        payment_time: new Date().toISOString()
      });

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
        orderId: razorpay_order_id
      });

      return NextResponse.json({
        error: updateError instanceof Error ? updateError.message : 'Failed to update booking',
        details: {
          bookingId: booking_id,
          orderId: razorpay_order_id
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