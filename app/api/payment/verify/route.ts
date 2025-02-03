import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';
import crypto from 'crypto';
import Razorpay from 'razorpay';

// Helper function to get allowed origins
const getAllowedOrigins = () => {
  const origins = [
    'http://localhost:3000',
    'https://onnrides.vercel.app',
    process.env.NEXT_PUBLIC_APP_URL,
    'https://api.razorpay.com',
    'https://checkout.razorpay.com'
  ].filter(Boolean) as string[];
  return origins;
};

// Helper function to get CORS headers
const getCorsHeaders = (origin: string): Record<string, string> => {
  const allowedOrigins = getAllowedOrigins();
  return {
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders('*'),
  });
}

export async function POST(request: NextRequest) {
  try {
    // Handle CORS
    const origin = request.headers.get('origin') || '*';
    const responseHeaders = {
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Get the payment verification details from the request
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_id
    } = await request.json();

    logger.info('Payment verification request received:', {
      razorpay_order_id,
      razorpay_payment_id,
      booking_id
    });

    // For QR code payments, we might only have the order_id initially
    if (razorpay_order_id && !razorpay_payment_id) {
      // Check payment status directly with Razorpay
      try {
        const instance = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID || '',
          key_secret: process.env.RAZORPAY_KEY_SECRET || ''
        });

        const order = await instance.orders.fetch(razorpay_order_id);
        
        if (order.status === 'paid') {
          // Get the payment details from the order
          const payments = await instance.orders.fetchPayments(razorpay_order_id);
          if (payments.items.length > 0) {
            const payment = payments.items[0];
            // Update the request with payment details
            Object.assign(request, {
              razorpay_payment_id: payment.id,
              razorpay_signature: crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
                .update(`${razorpay_order_id}|${payment.id}`)
                .digest('hex')
            });
          } else {
            logger.error('No payment found for paid order:', razorpay_order_id);
            return NextResponse.json(
              { error: 'Payment verification pending' },
              { status: 202, headers: responseHeaders }
            );
          }
        } else {
          logger.info('Order not yet paid:', { order_id: razorpay_order_id, status: order.status });
          return NextResponse.json(
            { error: 'Payment verification pending' },
            { status: 202, headers: responseHeaders }
          );
        }
      } catch (error) {
        logger.error('Error fetching order status:', error);
        return NextResponse.json(
          { error: 'Failed to verify payment status' },
          { status: 500, headers: responseHeaders }
        );
      }
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      logger.error('Missing payment verification details');
      return NextResponse.json(
        { error: 'Missing payment verification details' },
        { status: 400, headers: responseHeaders }
      );
    }

    // Verify the payment signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const secret = process.env.RAZORPAY_KEY_SECRET || '';
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      logger.error('Payment signature verification failed', {
        provided: razorpay_signature,
        generated: generated_signature
      });
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400, headers: responseHeaders }
      );
    }

    try {
      // First try to find the booking
      let findBookingResult;
      if (booking_id) {
        // If booking_id is provided, use it
        findBookingResult = await query(
          `SELECT id, status, payment_details 
           FROM bookings 
           WHERE id = $1`,
          [booking_id]
        );
      } else {
        // Otherwise, find the most recent pending booking
        findBookingResult = await query(
          `SELECT id, status, payment_details 
           FROM bookings 
           WHERE status = 'pending' 
           AND created_at > NOW() - INTERVAL '1 hour'
           ORDER BY created_at DESC 
           LIMIT 1`
        );
      }

      if (!findBookingResult.rows.length) {
        logger.error('No booking found to update', {
          booking_id,
          razorpay_order_id
        });
        return NextResponse.json(
          { error: 'No booking found' },
          { status: 404, headers: responseHeaders }
        );
      }

      const bookingId = findBookingResult.rows[0].id;
      logger.info('Found booking to update:', { bookingId });

      // Prepare payment details
      const paymentDetails = {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        payment_status: 'completed',
        payment_completed_at: new Date().toISOString(),
        verification_environment: process.env.NODE_ENV,
        verification_timestamp: new Date().toISOString()
      };

      logger.info('Attempting to update booking with payment details:', {
        bookingId,
        paymentDetails
      });

      // Update the booking with payment details
      const updateResult = await query(
        `UPDATE bookings 
         SET status = 'confirmed',
             payment_status = 'completed',
             payment_details = COALESCE(
               CASE 
                 WHEN payment_details IS NULL THEN '{}'::jsonb
                 ELSE payment_details 
               END || $1::jsonb,
               $1::jsonb
             ),
             updated_at = NOW()
         WHERE id = $2 
         AND (status = 'pending' OR payment_status = 'pending')
         RETURNING id, status, payment_status, payment_details`,
        [
          JSON.stringify(paymentDetails),
          bookingId
        ]
      );

      if (updateResult.rowCount === 0) {
        logger.error('Failed to update booking - no rows affected', {
          bookingId,
          currentStatus: findBookingResult.rows[0].status,
          currentPaymentStatus: findBookingResult.rows[0].payment_status
        });
        return NextResponse.json(
          { error: 'Failed to update booking - booking may already be confirmed' },
          { status: 400, headers: responseHeaders }
        );
      }

      // Log the successful update with the new payment details
      logger.info('Successfully updated booking:', {
        bookingId,
        status: updateResult.rows[0].status,
        payment_status: updateResult.rows[0].payment_status,
        payment_details: updateResult.rows[0].payment_details
      });

      return NextResponse.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          bookingId,
          status: updateResult.rows[0].status,
          payment_details: updateResult.rows[0].payment_details
        }
      }, { headers: responseHeaders });
    } catch (dbError) {
      logger.error('Database operation failed:', {
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        stack: dbError instanceof Error ? dbError.stack : undefined,
        details: dbError
      });
      
      return NextResponse.json(
        { error: 'Database operation failed' },
        { status: 500, headers: responseHeaders }
      );
    }
  } catch (error) {
    logger.error('Payment verification error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500, headers: {
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Origin': '*',
      }}
    );
  }
} 