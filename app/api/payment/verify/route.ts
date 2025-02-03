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

export async function POST(request: NextRequest) {
  try {
    const responseHeaders = getCorsHeaders(request.headers.get('origin'));

    // Get request body
    const body = await request.json();
    logger.info('Payment verification request received:', body);

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
              razorpay_signature: signature
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
      logger.error('Invalid payment signature');
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400, headers: responseHeaders }
      );
    }

    // Update booking
    await updateBooking(booking_id, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully'
    }, { headers: responseHeaders });

  } catch (error) {
    logger.error('Payment verification failed:', error);
    return NextResponse.json(
      { error: 'Payment verification failed' },
      { status: 500, headers: getCorsHeaders(null) }
    );
  }
}

// Helper function to update booking
async function updateBooking(bookingId: string, paymentDetails: any) {
  try {
    const result = await query(
      `UPDATE bookings 
       SET status = 'confirmed',
           payment_status = 'completed',
           payment_details = $1::jsonb,
           updated_at = NOW()
       WHERE id = $2 
       AND (status = 'pending' OR payment_status = 'pending')
       RETURNING id, status, payment_status`,
      [JSON.stringify({
        ...paymentDetails,
        verified_at: new Date().toISOString(),
        environment: process.env.NODE_ENV
      }), bookingId]
    );

    if (result.rowCount === 0) {
      throw new Error('No booking found or booking already confirmed');
    }

    logger.info('Booking updated successfully:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to update booking:', error);
    throw error;
  }
} 