import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

// Validate Cashfree credentials
if (!process.env.CASHFREE_APP_ID || !process.env.CASHFREE_SECRET_KEY) {
  logger.error('Missing Cashfree credentials');
  throw new Error('Missing Cashfree credentials');
}

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    logger.info('Session data:', { session });

    if (!session?.user) {
      logger.error('Authentication failed: No session found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user ID from session
    const userId = (session.user as any).id || session.user.email;
    if (!userId) {
      logger.error('No user ID found in session:', session.user);
      return NextResponse.json(
        { error: 'Invalid user session' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { amount, bookingDetails } = body;

    // Log request data
    logger.info('Received booking request:', {
      userId,
      amount,
      bookingDetails
    });

    // Validate required fields
    if (!bookingDetails || !amount) {
      logger.error('Missing required fields:', { amount, bookingDetails });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate booking details
    if (!bookingDetails.vehicleId || !bookingDetails.pickupDateTime || !bookingDetails.dropoffDateTime) {
      logger.error('Invalid booking details:', bookingDetails);
      return NextResponse.json(
        { error: 'Invalid booking details' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountInRupees = Number(amount);
    if (isNaN(amountInRupees) || amountInRupees < 1) {
      logger.error('Invalid amount:', { amount, amountInRupees });
      return NextResponse.json(
        { error: 'Invalid amount. Amount must be at least ₹1' },
        { status: 400 }
      );
    }

    try {
      // Calculate total hours
      const pickupDate = new Date(bookingDetails.pickupDateTime);
      const dropoffDate = new Date(bookingDetails.dropoffDateTime);
      const totalHours = (dropoffDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60);

      // Create Cashfree order
      const orderId = `order_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const orderData = {
        order_id: orderId,
        order_amount: amountInRupees,
        order_currency: "INR",
        customer_details: {
          customer_id: userId,
          customer_name: session.user.name || '',
          customer_email: session.user.email || '',
          customer_phone: session.user.phone || ''
        },
        order_meta: {
          return_url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-status?order_id={order_id}&order_token={order_token}`,
          notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/webhook`
        },
        order_note: `Booking for ${bookingDetails.vehicleName}`
      };

      // Create order with Cashfree
      const cashfreeResponse = await fetch('https://api.cashfree.com/pg/orders', {
        method: 'POST',
        headers: {
          'x-client-id': process.env.CASHFREE_APP_ID!,
          'x-client-secret': process.env.CASHFREE_SECRET_KEY!,
          'x-api-version': '2022-09-01',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
      });

      if (!cashfreeResponse.ok) {
        const errorData = await cashfreeResponse.json();
        logger.error('Cashfree order creation failed:', errorData);
        throw new Error('Failed to create payment order');
      }

      const cashfreeOrder = await cashfreeResponse.json();
      logger.info('Cashfree order created:', cashfreeOrder);

      // Create booking record
      const bookingResult = await query(
        `INSERT INTO bookings (
          id,
          user_id,
          vehicle_id,
          start_date,
          end_date,
          total_hours,
          total_price,
          status,
          payment_status,
          payment_details,
          pickup_location,
          created_at,
          updated_at
        ) VALUES (
          gen_random_uuid(),
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        )
        RETURNING id`,
        [
          userId,
          bookingDetails.vehicleId,
          bookingDetails.pickupDateTime,
          bookingDetails.dropoffDateTime,
          totalHours,
          amountInRupees,
          'pending',
          'pending',
          JSON.stringify({
            basePrice: Number(bookingDetails.basePrice),
            gst: Number(bookingDetails.gst),
            serviceFee: Number(bookingDetails.serviceFee),
            totalPrice: amountInRupees,
            cashfree_order_id: cashfreeOrder.order_id,
            payment_session_id: cashfreeOrder.payment_session_id
          }),
          bookingDetails.location
        ]
      );

      const bookingId = bookingResult.rows[0].id;
      logger.info('Booking record created:', { bookingId });

      // Return success response
      return NextResponse.json({
        success: true,
        data: {
          orderId: cashfreeOrder.order_id,
          sessionId: cashfreeOrder.payment_session_id,
          paymentUrl: cashfreeOrder.payment_link,
          bookingId
        }
      });

    } catch (error) {
      logger.error('Payment processing error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      return NextResponse.json(
        { error: 'Failed to process payment. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Server error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
} 