import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
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
import { PrismaClient } from '@prisma/client';
import { revalidatePath } from 'next/cache';

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

const prisma = new PrismaClient();

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

async function findBooking(bookingId: string, userId: string) {
  try {
    const booking = await prisma.bookings.findFirst({
      where: {
        id: bookingId,
        user_id: userId
      },
      include: {
        vehicle: true
      }
    });

    return booking;
  } catch (error) {
    logger.error('Error finding booking:', {
      error,
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
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      razorpay_payment_id, 
      razorpay_order_id, 
      razorpay_signature, 
      booking_id 
    } = body;

    logger.info('Payment verification request received', {
      booking_id,
      has_signature: !!razorpay_signature,
      razorpay_order_id,
      razorpay_payment_id,
      userId: session.user.id
    });

    // Find the booking
      const booking = await findBooking(booking_id, session.user.id);

      if (!booking) {
        logger.error('Booking not found', { 
          booking_id,
        payment_id: razorpay_payment_id,
        user_id: session.user.id
        });
        
        return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Update booking with payment information
    const updatedBooking = await prisma.bookings.update({
      where: { id: booking_id },
                    data: {
        status: 'confirmed',
        payment_status: 'completed',
        payment_details: JSON.stringify({
                      payment_id: razorpay_payment_id,
          order_id: razorpay_order_id,
          signature: razorpay_signature,
          payment_completed_at: new Date().toISOString()
        }),
        updated_at: new Date()
      }
    });

    // Revalidate relevant pages
    revalidatePath('/bookings');
    revalidatePath(`/bookings/${booking_id}`);
    revalidatePath('/admin/bookings');

      return NextResponse.json({
        success: true,
        data: {
        booking: {
          id: updatedBooking.id,
          status: updatedBooking.status,
          payment_status: updatedBooking.payment_status,
          payment_details: JSON.parse(updatedBooking.payment_details || '{}')
        }
      }
    });

  } catch (error) {
    logger.error('Payment verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500 }
    );
  }
} 