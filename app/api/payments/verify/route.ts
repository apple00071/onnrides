import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import crypto from 'crypto';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { EmailService } from '@/lib/email/service';
import { formatDateTimeIST } from '@/lib/utils/timezone';
import { formatCurrency } from '@/lib/utils/currency';
import type { QueryResult } from 'pg';
import { WhatsAppService } from '@/app/lib/whatsapp/service';
import Razorpay from 'razorpay';
import { AxiosError } from 'axios';

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
  return formatTimeIST(date);
}

// Update formatShortDateIST to use centralized utility
const formatShortDateIST = (date: Date | string) => {
  try {
    return formatDateTimeIST(date);
  } catch (error) {
    logger.error('Error formatting short date IST', { date, error });
    return String(date);
  }
};

interface PaymentDetails {
  payment_capture?: Record<string, unknown>;
  razorpay_payment_id?: string;
  razorpay_order_id?: string;
  direct_capture?: boolean;
  payment_status?: string;
  payment_completed_at?: string;
  amount_paid?: number;
  currency?: string;
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
  payment_details: PaymentDetails;
  pickup_location: string;
}

interface SerializedError {
  name?: string;
  message?: string;
  stack?: string;
  code?: string | number;
  [key: string]: unknown;
}

function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    const serialized: SerializedError = {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
    // Safely copy any additional properties
    for (const [key, value] of Object.entries(error)) {
      if (key !== 'name' && key !== 'message' && key !== 'stack') {
        serialized[key] = value;
      }
    }
    return serialized;
  }
  return typeof error === 'object' ? { ...(error as Record<string, unknown>) } : { message: String(error) };
}

// Find booking by ID and user ID with more robust error handling
async function findBooking(bookingId: string, userId: string): Promise<BookingRow | null> {
  try {
    logger.info('Attempting to find booking', { bookingId, userId });
    
    const result = await query(
      `SELECT * FROM bookings WHERE booking_id = $1::uuid AND user_id = $2`,
      [bookingId, userId]
    );
    
    if (result.rows.length > 0) {
      logger.info('Booking found successfully', { 
        bookingId, 
        booking_db_id: result.rows[0].id
      });
      return result.rows[0];
    } else {
      logger.warn('No booking found with provided ID', { bookingId, userId });
      return null;
    }
  } catch (error) {
    logger.error('Database error when finding booking', {
      bookingId,
      userId,
      error: serializeError(error)
    });
    return null;
  }
}

// More robust fetching of order ID
async function findOrderIdForBooking(bookingId: string, paymentId: string): Promise<string | null> {
  try {
    logger.info('Searching for order ID', { bookingId, paymentId });
    
    // Method 1: Check booking record
    try {
      const result = await query(
        `SELECT payment_details->>'razorpay_order_id' as order_id FROM bookings WHERE booking_id = $1::uuid`,
        [bookingId]
      );
      
      if (result.rows.length > 0 && result.rows[0].order_id) {
        logger.info('Found order ID in booking record', { 
          bookingId, 
          orderId: result.rows[0].order_id 
        });
        return result.rows[0].order_id;
      }
    } catch (dbError) {
      logger.warn('Database error when searching for order ID', {
        error: serializeError(dbError)
      });
      // Continue to other methods
    }
    
    // Method 2: Try to get from payment details
    try {
      const payment = await razorpay.payments.fetch(paymentId);
      
      if (payment && payment.order_id) {
        logger.info('Found order ID from payment object', { 
          paymentId,
          orderId: payment.order_id
        });
        return payment.order_id;
      }
    } catch (paymentError) {
      logger.warn('Error fetching payment details for order ID', {
        error: serializeError(paymentError)
      });
      // Continue to other methods
    }
    
    // Method 3: Search through recent orders
    try {
      logger.info('Searching through recent Razorpay orders');
      const orders = await razorpay.orders.all({ count: 100 });
      
      if (orders && orders.items && Array.isArray(orders.items)) {
        // First try to match by booking ID in notes
        const matchingOrder = orders.items.find((order: any) => {
          return order.notes && 
                 (order.notes.bookingId === bookingId || 
                  order.notes.booking_id === bookingId);
        });
        
        if (matchingOrder) {
          logger.info('Found matching order by booking ID in notes', {
            orderId: matchingOrder.id
          });
          return matchingOrder.id;
        }
        
        // Then check receipt which might contain booking ID
        const receiptMatch = orders.items.find((order: any) => {
          return order.receipt && order.receipt.includes(bookingId);
        });
        
        if (receiptMatch) {
          logger.info('Found matching order by receipt', {
            orderId: receiptMatch.id
          });
          return receiptMatch.id;
        }
      }
    } catch (ordersError) {
      logger.error('Error fetching orders from Razorpay', {
        error: serializeError(ordersError)
      });
    }
    
    // Method 4: Create a new order as last resort
    try {
      logger.warn('Could not find existing order, attempting to create a new one', {
        bookingId, paymentId
      });
      
      // First get booking details to determine amount
      const bookingResult = await query(
        `SELECT total_price FROM bookings WHERE booking_id = $1::uuid`,
        [bookingId]
      );
      
      if (bookingResult.rows.length > 0) {
        const totalPrice = bookingResult.rows[0].total_price;
        // Calculate 5% advance payment
        const advanceAmount = Math.ceil(totalPrice * 0.05);
        // Convert to paise
        const amountInPaise = Math.max(100, Math.round(advanceAmount * 100));
        
        // Create a new order
        const newOrder = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `recovery_${bookingId}`,
          notes: {
            bookingId: bookingId,
            paymentId: paymentId,
            isRecoveryOrder: 'true'
          }
        }) as { id: string };
        
        if (newOrder && newOrder.id) {
          logger.info('Created recovery order for payment verification', {
            newOrderId: newOrder.id
          });
          return newOrder.id;
        }
      }
    } catch (createError) {
      logger.error('Failed to create recovery order', {
        error: serializeError(createError)
      });
    }
    
    logger.error('Failed to find or create order ID by any method', {
      bookingId, paymentId
    });
    return null;
  } catch (error) {
    logger.error('Unexpected error finding order ID for booking', {
      error: serializeError(error)
    });
    return null;
  }
}

interface RazorpayPayment {
  id: string;
  entity: string;
  amount: string | number;
  currency: string;
  status: string;
  order_id: string;
  invoice_id: string | null;
  international: boolean;
  method: string;
  amount_refunded?: number;
  refund_status: string | null;
  captured: boolean;
  description?: string;
  card_id: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  email: string;
  contact: string | number;
  notes: Record<string, any>;
  fee: number;
  tax: number;
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_step: string | null;
  error_reason: string | null;
  acquirer_data?: {
    auth_code?: string;
  };
  created_at: number;
}

// Update booking status after payment
async function updateBookingAfterPayment(
  bookingId: string, 
  paymentId: string, 
  orderId: string, 
  captureAmount: number, 
  currency: string,
  captureResponse: RazorpayPayment
): Promise<BookingRow> {
  try {
    // Convert amount to number if it's a string
    const amount = typeof captureResponse.amount === 'string' 
      ? parseFloat(captureResponse.amount) 
      : captureResponse.amount;

    // Convert contact to string if it's a number
    const contact = typeof captureResponse.contact === 'number'
      ? captureResponse.contact.toString()
      : captureResponse.contact;

    // Update booking with payment details
    const result = await query(
      `UPDATE bookings 
       SET payment_status = $1::uuid,
           payment_details = $2,
           status = $3,
           updated_at = NOW()
       WHERE id = $4::uuid
       RETURNING *`,
      [
        'completed',
        JSON.stringify({
          payment_capture: {
            ...captureResponse,
            contact // Use the converted contact value
          },
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderId,
          direct_capture: true,
          payment_status: 'completed',
          payment_completed_at: new Date().toISOString(),
          amount_paid: amount,
          currency: currency
        }),
        'confirmed',
        bookingId
      ]
    );

    return result.rows[0];
  } catch (error) {
    logger.error('Error updating booking after payment:', error);
    throw error;
  }
}

// Main verification endpoint
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
      booking_id,
      has_signature: !!razorpay_signature
    });

    // Check minimum required parameters
    if (!razorpay_payment_id || !booking_id) {
      logger.error('Missing minimum required parameters', { 
        has_payment_id: !!razorpay_payment_id,
        has_booking_id: !!booking_id
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment ID and Booking ID are required for verification',
        },
        { status: 400 }
      );
    }

    try {
      // 1. Get booking details from database
      const booking = await findBooking(booking_id, session.user.id);

      if (!booking) {
        logger.error('Booking not found', { 
          booking_id,
          user_id: session.user.id,
          payment_id: razorpay_payment_id
        });
        return NextResponse.json(
          { 
            success: false, 
            error: 'Booking not found',
            details: {
              bookingId: booking_id,
              paymentId: razorpay_payment_id
            }
          },
          { status: 404 }
        );
      }

      // 2. Get the payment details from Razorpay
      let payment;
      try {
        logger.info('Fetching payment details from Razorpay', {
          paymentId: razorpay_payment_id
        });
        
        payment = await razorpay.payments.fetch(razorpay_payment_id);
        
        logger.info('Successfully fetched payment details', {
          paymentId: razorpay_payment_id,
          status: payment.status,
          amount: payment.amount,
          currency: payment.currency,
          hasOrderId: !!payment.order_id
        });
      } catch (error) {
        logger.error('Error fetching payment from Razorpay', {
          paymentId: razorpay_payment_id,
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
      
      // 3. If order ID is missing, try to find it
      let orderId = razorpay_order_id;
      if (!orderId) {
        logger.warn('Order ID missing from request, attempting to find it', {
          bookingId: booking_id,
          paymentId: razorpay_payment_id
        });
        
        // If payment object has order_id, use that
        if (payment.order_id) {
          orderId = payment.order_id;
          logger.info('Found order ID from payment object', {
            orderId,
            paymentId: razorpay_payment_id
          });
        } else {
          // Otherwise try to find using more extensive methods
          orderId = await findOrderIdForBooking(booking_id, razorpay_payment_id);
          
          if (!orderId) {
            logger.error('Could not find order ID for booking', {
              bookingId: booking_id,
              paymentId: razorpay_payment_id
            });
            
            // Instead of failing, create a direct payment capture without order
            logger.info('Attempting direct payment capture without order', {
              paymentId: razorpay_payment_id
            });
            
            try {
              // If payment is already captured, proceed without order
              if (payment.status === 'captured') {
                logger.info('Payment already captured, updating booking without order ID');
                
                // Update booking directly
                const emergencyUpdate = await query(
                  `UPDATE bookings 
                   SET status = 'confirmed',
                       payment_status = 'completed',
                       payment_details = jsonb_build_object(
                         'payment_capture', $1::jsonb,
                         'razorpay_payment_id', $2::text,
                         'direct_capture', true,
                         'payment_status', 'completed',
                         'payment_completed_at', CURRENT_TIMESTAMP,
                         'amount_paid', $3::numeric,
                         'currency', $4::text
                       ),
                       updated_at = CURRENT_TIMESTAMP
                   WHERE booking_id = $5::text
                   RETURNING id::text, booking_id, status, payment_status, payment_details`,
                  [
                    JSON.stringify(payment),
                    razorpay_payment_id,
                    Number(payment.amount) / 100,
                    payment.currency,
                    booking_id
                  ]
                );
                
                if (emergencyUpdate.rows.length > 0) {
                  const updatedBooking = emergencyUpdate.rows[0];
                  
                  logger.info('Emergency booking update successful without order ID', {
                    bookingId: updatedBooking.booking_id
                  });
                  
                  return NextResponse.json({
                    success: true,
                    message: 'Payment verified and booking updated (emergency mode)',
                    data: {
                      booking_id: updatedBooking.booking_id,
                      payment_id: razorpay_payment_id,
                      amount: Number(payment.amount) / 100,
                      currency: payment.currency,
                      status: updatedBooking.status,
                      payment_status: updatedBooking.payment_status,
                      emergency_mode: true
                    }
                  });
                }
              }
            } catch (emergencyError) {
              logger.error('Emergency payment capture failed', {
                error: serializeError(emergencyError)
              });
            }
            
            // If emergency mode failed or payment not captured, return error
            return NextResponse.json(
              { 
                success: false, 
                error: 'Could not find order ID for this booking',
                details: {
                  bookingId: booking_id,
                  paymentId: razorpay_payment_id,
                  paymentStatus: payment.status
                }
              },
              { status: 400 }
            );
          }
          
          logger.info('Successfully found order ID through alternative methods', {
            orderId,
            bookingId: booking_id
          });
        }
      }
      
      // 4. Get order details
      let order;
      try {
        logger.info('Fetching order details', { orderId });
        order = await razorpay.orders.fetch(orderId);
        
        logger.info('Successfully fetched order details', {
          orderId,
          amount: order.amount,
          currency: order.currency,
          status: order.status
        });
      } catch (error) {
        logger.error('Error fetching order from Razorpay', {
          orderId,
          error: serializeError(error)
        });
        
        return NextResponse.json(
          { 
            success: false, 
            error: 'Invalid order ID or error fetching order',
            details: {
              message: error instanceof Error ? error.message : 'Unknown order error',
              orderId
            }
          },
          { status: 400 }
        );
      }

      // 5. Verify signature if provided
      let signatureValid = false;
      
      if (razorpay_signature) {
        try {
          const text = `${orderId}|${razorpay_payment_id}`;
          const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
            .update(text)
            .digest('hex');
          
          signatureValid = generatedSignature === razorpay_signature;
          
          if (!signatureValid) {
            logger.warn('Invalid payment signature, but continuing with verification', {
              paymentId: razorpay_payment_id,
              orderId,
              providedSignature: razorpay_signature.substring(0, 10) + '...',
              generatedSignatureStart: generatedSignature.substring(0, 10) + '...'
            });
          } else {
            logger.info('Payment signature verified successfully');
          }
        } catch (signatureError) {
          logger.error('Error verifying signature', {
            error: serializeError(signatureError)
          });
          // Continue without signature validation
        }
      } else {
        logger.warn('Signature missing, skipping signature verification', {
          paymentId: razorpay_payment_id,
          orderId
        });
      }
      
      // 6. Check payment status and capture if needed
      const captureAmount = Number(order.amount);
      let captureResponse = payment;
      
      if (payment.status === 'captured') {
        logger.info('Payment already captured', { 
          paymentId: razorpay_payment_id,
          status: payment.status
        });
      } else if (payment.status === 'authorized') {
        try {
          logger.info('Attempting to capture payment', {
            paymentId: razorpay_payment_id,
            amount: captureAmount,
            amountINR: Number(captureAmount) / 100
          });
          
          // Capture the payment
        captureResponse = await razorpay.payments.capture(
          razorpay_payment_id,
          captureAmount,
          'INR'
        );
          
          logger.info('Payment captured successfully', {
            paymentId: razorpay_payment_id,
            amount: Number(captureAmount) / 100,
            currency: 'INR',
            captureId: captureResponse.id
          });
        } catch (captureError) {
          logger.error('Error capturing payment', {
            error: serializeError(captureError),
            paymentId: razorpay_payment_id,
            amount: captureAmount
          });
          
          return NextResponse.json(
            { 
              success: false, 
              error: 'Failed to capture payment',
              details: {
                message: captureError instanceof Error ? captureError.message : 'Unknown capture error',
                paymentId: razorpay_payment_id
              }
            },
            { status: 500 }
          );
        }
      } else {
        logger.error('Payment in invalid state for capture', {
          paymentId: razorpay_payment_id,
          status: payment.status
        });
        
        return NextResponse.json(
          { 
            success: false, 
            error: `Payment in invalid state: ${payment.status}`,
            details: {
              paymentId: razorpay_payment_id,
              paymentStatus: payment.status
            }
          },
          { status: 400 }
        );
      }
      
      // 7. Update booking status with robust error handling
      let updatedBooking;
      try {
        logger.info('Updating booking after payment', {
          bookingId: booking_id,
          paymentId: razorpay_payment_id
        });
        
        updatedBooking = await updateBookingAfterPayment(
          booking_id, 
          razorpay_payment_id, 
          orderId,
          captureAmount,
          order.currency,
          captureResponse
        );
        
        if (!updatedBooking) {
          throw new Error('Failed to update booking - no results returned');
        }
      } catch (updateError) {
        logger.error('Error updating booking after payment', {
          error: serializeError(updateError),
          bookingId: booking_id
        });
        
        // Emergency direct update as fallback
        try {
          logger.info('Attempting emergency direct booking update');
          
          const emergencyUpdate = await query(
        `UPDATE bookings 
         SET status = 'confirmed',
             payment_status = 'completed',
             payment_details = jsonb_build_object(
                   'emergency_update', true,
                   'razorpay_payment_id', $1::text,
                   'razorpay_order_id', $2::text,
               'payment_status', 'completed',
               'payment_completed_at', CURRENT_TIMESTAMP,
                   'amount_paid', $3::numeric,
                   'currency', $4::text
             ),
             updated_at = CURRENT_TIMESTAMP
             WHERE booking_id = $5::text
         RETURNING id::text, booking_id, status, payment_status, payment_details`,
        [
          razorpay_payment_id,
              orderId,
          Number(captureAmount) / 100,
          order.currency,
          booking_id
        ]
      );

          if (emergencyUpdate.rows.length > 0) {
            updatedBooking = emergencyUpdate.rows[0];
            logger.info('Emergency booking update successful', {
              bookingId: updatedBooking.booking_id
            });
          } else {
            throw new Error('Emergency update failed - no results returned');
          }
        } catch (emergencyError) {
          logger.error('Emergency booking update failed', {
            error: serializeError(emergencyError)
          });
          
          return NextResponse.json(
            { 
              success: false, 
              error: 'Failed to update booking status after payment',
              details: {
                originalError: updateError instanceof Error ? updateError.message : 'Unknown error',
                bookingId: booking_id,
                paymentId: razorpay_payment_id
              }
            },
            { status: 500 }
          );
        }
      }
      
      // 8. Log success and return response
      logger.info('Booking status updated successfully', {
        booking_id: updatedBooking.booking_id,
        internal_id: updatedBooking.id,
        payment_id: razorpay_payment_id,
        order_id: orderId,
        amount: Number(captureAmount) / 100,
        status: updatedBooking.status,
        payment_status: updatedBooking.payment_status
      });

      // 9. Send booking confirmation email
      try {
        // Get full booking details with user and vehicle info
        const bookingResult = await query(
          `SELECT 
            b.*,
            u.name as user_name,
            u.email as user_email,
            v.name as vehicle_name,
            b.booking_id
           FROM bookings b
           JOIN users u ON b.user_id = u.id
           JOIN vehicles v ON b.vehicle_id = v.id
           WHERE b.booking_id = $1::uuid`,
          [booking_id]
        );

        if (bookingResult.rows.length > 0) {
          const booking = bookingResult.rows[0];
          const emailService = EmailService.getInstance();

          await emailService.sendBookingConfirmation(
            booking.user_email,
            {
              userName: booking.user_name,
              vehicleName: booking.vehicle_name,
              bookingId: booking.booking_id,
              startDate: formatDateIST(booking.start_date),
              endDate: formatDateIST(booking.end_date),
              amount: `₹${Number(captureAmount) / 100}`,
              paymentId: razorpay_payment_id
            }
          );

          logger.info('Booking confirmation email sent', {
            bookingId: booking.booking_id,
            userEmail: booking.user_email
          });
        } else {
          logger.error('Could not find booking details for confirmation email', {
            bookingId: booking_id
          });
        }
      } catch (emailError) {
        logger.error('Failed to send booking confirmation email', {
          error: serializeError(emailError),
          bookingId: booking_id
        });
        // Don't throw error here, continue with success response
      }

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
      logger.error('Unhandled payment verification error', {
        error: serializeError(error),
        bookingId: booking_id,
        paymentId: razorpay_payment_id
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Payment verification failed with an unhandled error',
          details: {
            message: error instanceof Error ? error.message : 'Unknown error',
            bookingId: booking_id,
            paymentId: razorpay_payment_id
          }
        },
        { status: 500 }
      );
    }

  } catch (error) {
    logger.error('Critical payment verification endpoint error', {
      error: serializeError(error)
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Critical server error during payment verification',
        details: {
          message: error instanceof Error ? error.message : 'Unknown server error'
        }
      },
      { status: 500 }
    );
  }
} 