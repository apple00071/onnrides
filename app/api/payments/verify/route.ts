import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { revalidatePath } from 'next/cache';
import { EmailService } from '@/lib/email/service';
import { WhatsAppService } from '@/lib/whatsapp/service';
import { formatDateTimeIST } from '@/lib/utils/timezone';
import logger from '@/lib/logger';
import Razorpay from 'razorpay';
import { query } from '@/lib/db';
import { validatePaymentVerification } from '@/lib/razorpay';
import { prisma } from '@/lib/prisma';

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

// Helper function to safely serialize errors
function serializeError(error: unknown): Record<string, any> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  return { message: String(error) };
}

async function findBooking(bookingId: string, userId: string) {
  try {
    logger.info('Finding booking:', {
      bookingId,
      userId
    });

    // Try to find the booking by either UUID or short ID
    const booking = await prisma.bookings.findFirst({
      where: {
        OR: [
          { id: bookingId },
          { booking_id: bookingId }
        ],
        user_id: userId
      },
      include: {
        vehicle: true
      }
    });

    if (!booking) {
      logger.warn('No booking found:', {
        bookingId,
        userId
      });
      return null;
    }

    logger.info('Found booking:', {
      id: booking.id,
      bookingId: booking.booking_id,
      status: booking.status,
      paymentStatus: booking.payment_status
    });

    return booking;
  } catch (error) {
    logger.error('Error finding booking:', {
      error: serializeError(error),
      bookingId,
      userId
    });
    throw error;
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
export async function POST(req: Request) {
  const startTime = Date.now();
  const requestId = `pv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info('Payment verification started', {
      requestId,
      timestamp: new Date().toISOString()
    });

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      logger.error('Unauthorized access attempt in payment verification', {
        requestId,
        hasSession: !!session,
        hasUser: !!session?.user,
        timestamp: new Date().toISOString()
      });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userId = session.user.id;
    const data = await req.json();
    const { 
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      booking_id 
    } = data;

    logger.info('Payment verification request details', {
      requestId,
      booking_id,
      userId,
      has_payment_id: !!razorpay_payment_id,
      has_order_id: !!razorpay_order_id,
      has_signature: !!razorpay_signature,
      timestamp: new Date().toISOString()
    });

    // Find the booking
    logger.info('Finding booking record', {
      requestId,
      booking_id,
      userId
    });

    const booking = await prisma.bookings.findFirst({
      where: {
        OR: [
          { id: booking_id },
          { booking_id: booking_id }
        ],
        user_id: userId
      },
      include: {
        vehicle: true,
        user: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!booking) {
      logger.error('Booking not found during payment verification', {
        requestId,
        booking_id,
        userId,
        timestamp: new Date().toISOString()
      });
      return new Response(JSON.stringify({ error: 'Booking not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.info('Found booking record', {
      requestId,
      booking_id: booking.id,
      booking_short_id: booking.booking_id,
      current_status: booking.status,
      current_payment_status: booking.payment_status,
      vehicle_id: booking.vehicle_id,
      timestamp: new Date().toISOString()
    });

    // Verify payment signature
    logger.info('Verifying payment signature', {
      requestId,
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      has_signature: !!razorpay_signature
    });

    const isValid = validatePaymentVerification({
      order_id: razorpay_order_id,
      payment_id: razorpay_payment_id,
      signature: razorpay_signature
    });

    if (!isValid) {
      logger.error('Invalid payment signature', {
        requestId,
        booking_id,
        razorpay_order_id,
        razorpay_payment_id,
        timestamp: new Date().toISOString()
      });
      return new Response(JSON.stringify({ error: 'Invalid payment signature' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    logger.info('Payment signature verified successfully', {
      requestId,
      booking_id: booking.id,
      payment_id: razorpay_payment_id
    });

    // Fetch payment details from Razorpay
    try {
      const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
      logger.info('Fetched Razorpay payment details', {
        requestId,
        payment_id: razorpay_payment_id,
        amount: paymentDetails.amount,
        status: paymentDetails.status,
        method: paymentDetails.method,
        bank: paymentDetails.bank,
        card_id: paymentDetails.card_id,
        wallet: paymentDetails.wallet,
        vpa: paymentDetails.vpa,
        error_code: paymentDetails.error_code,
        error_description: paymentDetails.error_description,
        acquirer_data: paymentDetails.acquirer_data
      });
    } catch (error) {
      logger.error('Error fetching Razorpay payment details', {
        requestId,
        error: serializeError(error),
        payment_id: razorpay_payment_id
      });
    }

    // Update booking status
    try {
      const updatedBooking = await prisma.bookings.update({
        where: { id: booking.id },
        data: {
          payment_status: 'PAID',
          status: 'CONFIRMED',
          payment_details: JSON.stringify({
            payment_id: razorpay_payment_id,
            order_id: razorpay_order_id,
            signature: razorpay_signature,
            payment_completed_at: new Date().toISOString(),
            verification_request_id: requestId
          })
        }
      });

      logger.info('Booking updated successfully', {
        requestId,
        booking_id: booking.id,
        new_status: updatedBooking.status,
        new_payment_status: updatedBooking.payment_status,
        timestamp: new Date().toISOString()
      });

      // Send notifications
      try {
        // Send email notification
        const emailData = {
          userName: booking.user.name || 'Customer',
          vehicleName: booking.vehicle.name,
          bookingId: booking.booking_id || booking.id,
          startDate: booking.start_date.toISOString(),
          endDate: booking.end_date.toISOString(),
          amount: booking.total_price.toString(),
          paymentId: razorpay_payment_id
        };
        await EmailService.getInstance().sendBookingConfirmation(booking.user.email!, emailData);
        logger.info('Email notification sent successfully', {
          requestId,
          bookingId: booking.booking_id || booking.id,
          email: booking.user.email,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        logger.error('Failed to send email notification', {
          requestId,
          bookingId: booking.booking_id || booking.id,
          error: serializeError(error),
          timestamp: new Date().toISOString()
        });
      }

      // Send WhatsApp notification
      if (booking.user.phone) {
        try {
          const whatsappData = {
            customerName: booking.user.name || 'Customer',
            customerPhone: booking.user.phone,
            vehicleType: booking.vehicle.type || 'Vehicle',
            vehicleModel: booking.vehicle.name,
            startDate: booking.start_date.toISOString(),
            endDate: booking.end_date.toISOString(),
            bookingId: booking.booking_id || booking.id,
            totalAmount: booking.total_price.toString()
          };
          await WhatsAppService.getInstance().sendBookingConfirmation(whatsappData);
          logger.info('WhatsApp notification sent successfully', {
            requestId,
            bookingId: booking.booking_id || booking.id,
            phone: booking.user.phone,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          logger.error('Failed to send WhatsApp notification', {
            requestId,
            bookingId: booking.booking_id || booking.id,
            error: serializeError(error),
            timestamp: new Date().toISOString()
          });
        }
      }

      // Calculate and log processing time
      const processingTime = Date.now() - startTime;
      logger.info('Payment verification completed', {
        requestId,
        booking_id: booking.id,
        processing_time_ms: processingTime,
        timestamp: new Date().toISOString()
      });

      // Return success response
      return new Response(JSON.stringify({ 
        success: true,
        booking_id: booking.booking_id || booking.id,
        processing_time_ms: processingTime
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      logger.error('Error updating booking after payment verification', {
        requestId,
        error: serializeError(error),
        booking_id: booking.id,
        processing_time_ms: Date.now() - startTime
      });
      return new Response(JSON.stringify({ error: 'Failed to update booking status' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logger.error('Payment verification failed:', {
      requestId,
      error: serializeError(error),
      processing_time_ms: processingTime,
      timestamp: new Date().toISOString()
    });
    return new Response(JSON.stringify({ error: 'Payment verification failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 