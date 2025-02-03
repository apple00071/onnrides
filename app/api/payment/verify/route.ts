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

// Helper function to verify Razorpay signature
const verifySignature = (orderId: string, paymentId: string, signature: string) => {
  const text = `${orderId}|${paymentId}`;
  const generated_signature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(text)
    .digest('hex');
  return generated_signature === signature;
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
        bookingId 
      });
    }
    
    if (!result?.rows?.length) {
      // If no booking found by ID, try to find by order ID in payment_details
      result = await query(
        `SELECT id, status, payment_status, payment_details 
         FROM bookings 
         WHERE payment_details->>'razorpay_order_id' = $1
         OR payment_details->>'order_id' = $1
         ORDER BY created_at DESC 
         LIMIT 1`,
        [orderId]
      );
      logger.info('Search by order ID result:', { 
        found: result?.rows?.length > 0,
        orderId 
      });
    }

    if (!result?.rows?.length) {
      // If still no booking found, try to find most recent pending booking
      result = await query(
        `SELECT id, status, payment_status, payment_details 
         FROM bookings 
         WHERE status = 'pending' 
         AND created_at > NOW() - INTERVAL '1 hour'
         ORDER BY created_at DESC 
         LIMIT 1`
      );
      logger.info('Search for recent pending booking result:', { 
        found: result?.rows?.length > 0 
      });
    }

    if (!result?.rows?.length) {
      logger.error('No booking found with any method');
      return null;
    }

    logger.info('Found booking:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    logger.error('Error finding booking:', error);
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
    const existingDetails = booking.payment_details || {};
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

    // If we only have order_id (QR code payment)
    if (razorpay_order_id && !razorpay_payment_id) {
      try {
        // Fetch order details from Razorpay
        const order = await razorpay.orders.fetch(razorpay_order_id);
        logger.info('Razorpay order details:', order);

        if (order.status === 'paid') {
          // Get payment details for the order
          const payments = await razorpay.orders.fetchPayments(razorpay_order_id);
          logger.info('Razorpay payments for order:', payments);
          
          if (payments.items && payments.items.length > 0) {
            const payment = payments.items[0];
            // Generate signature for the payment
            const signature = crypto
              .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
              .update(`${razorpay_order_id}|${payment.id}`)
              .digest('hex');

            // Update booking with payment details
            await updateBooking(booking_id, {
              razorpay_order_id,
              razorpay_payment_id: payment.id,
              razorpay_signature: signature,
              payment_method: 'qr',
              order_status: order.status,
              payment_time: new Date().toISOString()
            });

            return NextResponse.json({ 
              success: true,
              message: 'Payment verified successfully'
            }, { headers: responseHeaders });
          }
        }
        
        // If order is not paid yet
        return NextResponse.json(
          { error: 'Payment pending', status: order.status },
          { status: 202, headers: responseHeaders }
        );
      } catch (error) {
        logger.error('Error fetching Razorpay order:', error);
        return NextResponse.json(
          { error: 'Failed to verify payment with Razorpay' },
          { status: 500, headers: responseHeaders }
        );
      }
    }

    // For direct VPA payments
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: 'Missing payment details' },
        { status: 400, headers: responseHeaders }
      );
    }

    // Verify signature
    if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
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

    // Update booking
    await updateBooking(booking_id, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      payment_method: 'vpa',
      payment_time: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully'
    }, { headers: responseHeaders });

  } catch (error) {
    logger.error('Payment verification failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500, headers: getCorsHeaders(null) }
    );
  }
} 