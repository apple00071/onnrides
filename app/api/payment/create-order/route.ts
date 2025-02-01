import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import Razorpay from 'razorpay';
import logger from '@/lib/logger';

// Validate environment variables
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const NEXT_PUBLIC_RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

// Check each environment variable individually for better error reporting
const missingVars: string[] = [];
if (!RAZORPAY_KEY_ID) missingVars.push('RAZORPAY_KEY_ID');
if (!RAZORPAY_KEY_SECRET) missingVars.push('RAZORPAY_KEY_SECRET');
if (!NEXT_PUBLIC_RAZORPAY_KEY_ID) missingVars.push('NEXT_PUBLIC_RAZORPAY_KEY_ID');

if (missingVars.length > 0) {
  const errorMessage = `Missing required Razorpay environment variables: ${missingVars.join(', ')}`;
  logger.error(errorMessage, {
    hasKeyId: !!RAZORPAY_KEY_ID,
    hasKeySecret: !!RAZORPAY_KEY_SECRET,
    hasPublicKeyId: !!NEXT_PUBLIC_RAZORPAY_KEY_ID
  });
  throw new Error(errorMessage);
}

// At this point, we know these variables are defined
const razorpayKeyId = RAZORPAY_KEY_ID as string;
const razorpayKeySecret = RAZORPAY_KEY_SECRET as string;

let razorpay: Razorpay;
try {
  razorpay = new Razorpay({
    key_id: razorpayKeyId,
    key_secret: razorpayKeySecret,
  });
  logger.info('Razorpay initialized successfully');
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error initializing Razorpay';
  logger.error('Failed to initialize Razorpay:', {
    error: errorMessage,
    stack: error instanceof Error ? error.stack : undefined
  });
  throw new Error(`Failed to initialize Razorpay: ${errorMessage}`);
}

export async function POST(request: NextRequest) {
  try {
    logger.info('Received create order request');
    logger.debug('Environment variables check:', {
      hasRazorpayKeyId: !!process.env.RAZORPAY_KEY_ID,
      hasRazorpayKeySecret: !!process.env.RAZORPAY_KEY_SECRET,
      hasPublicKeyId: !!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      keyIdPrefix: process.env.RAZORPAY_KEY_ID?.substring(0, 8),
      publicKeyIdPrefix: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID?.substring(0, 8)
    });
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      logger.warn('Authentication missing');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    logger.info('User authenticated:', { userId: session.user.id });

    const body = await request.json();
    const { bookingId, amount } = body;
    logger.info('Request data:', { 
      bookingId, 
      amount,
      body,
      userId: session.user.id,
      requestHeaders: Object.fromEntries(request.headers)
    });

    if (!bookingId || amount === undefined) {
      logger.warn('Missing required fields:', { bookingId, amount, body });
      return NextResponse.json(
        { error: 'Booking ID and amount are required' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      logger.warn('Invalid amount:', { amount, body });
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Verify booking belongs to user
    const bookingResult = await query(`
      SELECT b.*, v.name as vehicle_name 
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.id = $1 AND b.user_id = $2 
      LIMIT 1
    `, [bookingId, session.user.id]);

    const booking = bookingResult.rows[0];
    if (!booking) {
      logger.warn('Booking not found or unauthorized:', { 
        bookingId, 
        userId: session.user.id,
        bookingResult 
      });
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }
    logger.info('Found booking:', { bookingId, booking });

    // Create Razorpay order
    const amountInPaise = Math.round(amount * 100); // Convert to paise and ensure it's an integer
    logger.info('Creating Razorpay order:', { 
      originalAmount: amount,
      amountInPaise,
      amountCalculation: `${amount} * 100 = ${amount * 100} -> rounded to ${amountInPaise}`,
      currency: 'INR',
      receipt: bookingId,
      razorpayConfig: {
        keyId: RAZORPAY_KEY_ID?.substring(0, 8),
        publicKeyId: NEXT_PUBLIC_RAZORPAY_KEY_ID?.substring(0, 8)
      }
    });

    if (amountInPaise <= 0) {
      logger.warn('Invalid amount after conversion:', { originalAmount: amount, amountInPaise });
      return NextResponse.json(
        { error: 'Invalid amount after conversion to paise' },
        { status: 400 }
      );
    }

    try {
      const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: bookingId,
        notes: {
          booking_id: bookingId,
          user_id: session.user.id,
          vehicle_name: booking.vehicle_name
        }
      });
      logger.info('Razorpay order created:', { 
        order: {
          ...order,
          id: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
          status: order.status
        },
        originalAmount: amount,
        amountInPaise
      });

      // Update booking with order ID
      await query(
        `UPDATE bookings 
         SET payment_details = jsonb_set(
           COALESCE(payment_details::jsonb, '{}'::jsonb),
           '{razorpay_order_id}',
           $1::jsonb
         ),
         updated_at = $2 
         WHERE id = $3`,
        [JSON.stringify(order.id), new Date(), bookingId]
      );
      logger.info('Booking updated with order ID:', { 
        bookingId, 
        orderId: order.id 
      });

      const response = { 
        success: true,
        data: {
          orderId: order.id,
          key: NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
          status: order.status,
          created_at: order.created_at
        }
      };
      logger.info('Sending response:', { 
        ...response, 
        data: { 
          ...response.data, 
          key: '***' 
        } 
      });

      return NextResponse.json(response);
    } catch (error) {
      logger.error('Error creating Razorpay order:', {
        error,
        stack: error instanceof Error ? error.stack : undefined,
        message: error instanceof Error ? error.message : String(error)
      });
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Failed to create Razorpay order' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error creating payment order:', {
      error,
      stack: error instanceof Error ? error.stack : undefined,
      message: error instanceof Error ? error.message : String(error)
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create payment order' },
      { status: 500 }
    );
  }
} 