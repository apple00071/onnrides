import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import logger from '@/lib/logger';
import { getRazorpayInstance } from '@/lib/razorpay';
import { query } from '@/lib/db';

// Initialize Razorpay client
const razorpay = getRazorpayInstance();

// Helper to safely serialize error objects
function serializeError(error: any): Record<string, any> {
  if (!error) return { message: 'Unknown error' };
  
  const serializedError: Record<string, any> = {};
  
  // Extract basic error properties
  if (error instanceof Error) {
    serializedError.name = error.name;
    serializedError.message = error.message;
    serializedError.stack = error.stack;
  } else if (typeof error === 'string') {
    serializedError.message = error;
  } else if (typeof error === 'object') {
    try {
      // Try to safely copy properties from error object
      Object.keys(error).forEach(key => {
        const value = error[key];
        // Avoid circular references
        if (typeof value !== 'function' && key !== 'toJSON') {
          serializedError[key] = value;
        }
      });
    } catch (e) {
      serializedError.message = 'Error object could not be serialized';
      serializedError.originalError = String(error);
    }
  } else {
    serializedError.message = 'Unknown error type';
    serializedError.originalError = String(error);
  }
  
  return serializedError;
}

// Update booking after payment verification
async function updateBookingAfterPayment(
  bookingId: string,
  paymentId: string,
  amount: string | number, 
  currency: string,
  paymentData: any
): Promise<any> {
  try {
    // Convert amount to number if it's a string
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    logger.info('Updating booking after payment recovery', {
      bookingId,
      paymentId,
      amountInSmallestUnit: numericAmount,
      amountInCurrency: numericAmount / 100,
      currency
    });
    
    const result = await query(
      `UPDATE bookings 
       SET status = 'confirmed',
           payment_status = 'completed',
           payment_details = jsonb_build_object(
             'recovery_capture', $1::jsonb,
             'razorpay_payment_id', $2::text,
             'payment_status', 'completed',
             'payment_completed_at', CURRENT_TIMESTAMP,
             'amount_paid', $3::numeric,
             'currency', $4::text,
             'recovery_process', true
           ),
           updated_at = CURRENT_TIMESTAMP
       WHERE booking_id = $5::text
       RETURNING id::text, booking_id, status, payment_status, payment_details`,
      [
        JSON.stringify(paymentData),
        paymentId,
        numericAmount / 100, // Convert to actual currency amount from smallest unit
        currency,
        bookingId
      ]
    );

    if (result.rows.length === 0) {
      logger.error('No booking found to update after payment recovery', {
        bookingId,
        paymentId
      });
      return null;
    }

    return result.rows[0];
  } catch (error) {
    logger.error('Error updating booking after payment recovery', {
      error: serializeError(error),
      bookingId,
      paymentId
    });
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    logger.info('Payment recovery endpoint called');
    
    // Get session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.error('No user session found during payment recovery');
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { payment_id, booking_id } = body;

    logger.info('Payment recovery request received', {
      userId: session.user.id,
      paymentId: payment_id,
      bookingId: booking_id
    });

    // Check required parameters
    if (!payment_id || !booking_id) {
      logger.error('Missing required parameters for payment recovery', { 
        hasPaymentId: !!payment_id,
        hasBookingId: !!booking_id
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment ID and Booking ID are required for recovery',
        },
        { status: 400 }
      );
    }

    try {
      // 1. Verify booking belongs to user
      const bookingResult = await query(
        `SELECT * FROM bookings WHERE booking_id = $1 AND user_id = $2`,
        [booking_id, session.user.id]
      );
      
      if (bookingResult.rows.length === 0) {
        logger.error('Booking not found or does not belong to user', {
          bookingId: booking_id,
          userId: session.user.id
        });
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Booking not found or does not belong to user',
          },
          { status: 404 }
        );
      }
      
      const booking = bookingResult.rows[0];
      
      // Check if payment already completed
      if (booking.payment_status === 'completed') {
        logger.info('Payment already completed for booking', {
          bookingId: booking_id,
          paymentId: payment_id
        });
        
        return NextResponse.json({
          success: true,
          message: 'Payment was already completed',
          data: {
            booking_id: booking.booking_id,
            payment_id: payment_id,
            status: booking.status,
            payment_status: booking.payment_status
          }
        });
      }
      
      // 2. Fetch payment from Razorpay
      let payment;
      try {
        logger.info('Fetching payment details from Razorpay', {
          paymentId: payment_id
        });
        
        payment = await razorpay.payments.fetch(payment_id);
        
        logger.info('Successfully fetched payment details', {
          paymentId: payment_id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency
        });
      } catch (error) {
        logger.error('Error fetching payment from Razorpay', {
          paymentId: payment_id,
          error: serializeError(error)
        });
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to verify payment with Razorpay',
            details: {
              message: error instanceof Error ? error.message : 'Unknown payment error'
            }
          },
          { status: 400 }
        );
      }
      
      // 3. Check payment status
      if (payment.status !== 'captured' && payment.status !== 'authorized') {
        logger.error('Payment in invalid state for recovery', {
          paymentId: payment_id,
          status: payment.status
        });
        
        return NextResponse.json(
          { 
            success: false, 
            error: `Payment in invalid state for recovery: ${payment.status}`,
            details: {
              paymentId: payment_id,
              paymentStatus: payment.status
            }
          },
          { status: 400 }
        );
      }
      
      // 4. Capture payment if authorized
      let captureResponse = payment;
      
      if (payment.status === 'authorized') {
        try {
          logger.info('Attempting to capture payment during recovery', {
            paymentId: payment_id,
            amount: payment.amount
          });
          
          // Capture the payment
          captureResponse = await razorpay.payments.capture(
            payment_id,
            payment.amount,
            payment.currency
          );
          
          logger.info('Payment captured successfully during recovery', {
            paymentId: payment_id,
            amount: Number(payment.amount) / 100,
            currency: payment.currency
          });
        } catch (captureError) {
          logger.error('Error capturing payment during recovery', {
            error: serializeError(captureError),
            paymentId: payment_id
          });
          
          return NextResponse.json(
            { 
              success: false, 
              error: 'Failed to capture payment during recovery',
              details: {
                message: captureError instanceof Error ? captureError.message : 'Unknown capture error',
                paymentId: payment_id
              }
            },
            { status: 500 }
          );
        }
      }
      
      // 5. Update booking status
      const updatedBooking = await updateBookingAfterPayment(
        booking_id,
        payment_id,
        captureResponse.amount,
        captureResponse.currency,
        captureResponse
      );
      
      if (!updatedBooking) {
        logger.error('Failed to update booking during recovery', {
          bookingId: booking_id,
          paymentId: payment_id
        });
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Failed to update booking status during recovery',
          },
          { status: 500 }
        );
      }
      
      // 6. Success!
      logger.info('Payment recovery successful', {
        bookingId: booking_id,
        paymentId: payment_id,
        status: updatedBooking.status,
        paymentStatus: updatedBooking.payment_status
      });
      
      return NextResponse.json({
        success: true,
        message: 'Payment recovered and booking updated successfully',
        data: {
          booking_id: updatedBooking.booking_id,
          payment_id: payment_id,
          amount: Number(captureResponse.amount) / 100,
          currency: captureResponse.currency,
          status: updatedBooking.status,
          payment_status: updatedBooking.payment_status
        }
      });
      
    } catch (error) {
      logger.error('Unhandled payment recovery error', {
        error: serializeError(error),
        bookingId: booking_id,
        paymentId: payment_id
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment recovery failed with an unhandled error',
          details: {
            message: error instanceof Error ? error.message : 'Unknown error'
          }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Critical payment recovery endpoint error', {
      error: serializeError(error)
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Critical server error during payment recovery',
        details: {
          message: error instanceof Error ? error.message : 'Unknown server error'
        }
      },
      { status: 500 }
    );
  }
} 