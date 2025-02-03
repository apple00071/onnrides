import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import Razorpay from 'razorpay';
import { logger } from '@/lib/logger';

// Validate Razorpay credentials
if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  logger.error('Missing Razorpay credentials');
  throw new Error('Missing Razorpay credentials');
}

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

    // Validate and fix amount (ensure it's in rupees, not paise)
    const amountInRupees = Number(amount);
    if (isNaN(amountInRupees) || amountInRupees < 1) {
      logger.error('Invalid amount:', { amount, amountInRupees });
      return NextResponse.json(
        { error: 'Invalid amount. Amount must be at least ₹1' },
        { status: 400 }
      );
    }

    try {
      logger.info('Creating booking record...', {
        userId,
        vehicleId: bookingDetails.vehicleId,
        pickupDateTime: bookingDetails.pickupDateTime,
        dropoffDateTime: bookingDetails.dropoffDateTime,
        duration: bookingDetails.duration,
        totalPrice: amountInRupees,
        location: bookingDetails.location
      });

      // Calculate total hours
      const pickupDate = new Date(bookingDetails.pickupDateTime);
      const dropoffDate = new Date(bookingDetails.dropoffDateTime);
      const totalHours = (dropoffDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60);

      // First, create Razorpay order
      const amountInPaise = Math.round(amountInRupees * 100);
      logger.info('Creating Razorpay order...', {
        amountInRupees,
        amountInPaise,
        currency: 'INR'
      });

      // Add try-catch specifically for Razorpay order creation
      let order;
      try {
        order = await razorpay.orders.create({
          amount: amountInPaise,
          currency: 'INR',
          receipt: `booking_${Date.now()}`,
          notes: {
            user_id: userId,
            vehicle_id: bookingDetails.vehicleId
          }
        });
        logger.info('Razorpay order created:', { orderId: order.id });
      } catch (razorpayError) {
        logger.error('Razorpay order creation failed:', {
          error: razorpayError instanceof Error ? razorpayError.message : 'Unknown error',
          stack: razorpayError instanceof Error ? razorpayError.stack : undefined,
          details: razorpayError
        });
        return NextResponse.json(
          { error: 'Failed to create payment order. Please check your payment details.' },
          { status: 500 }
        );
      }

      // Then, create booking record
      let bookingResult;
      try {
        bookingResult = await query(
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
              razorpay_order_id: order.id
            }),
            bookingDetails.location
          ]
        );
      } catch (dbError) {
        logger.error('Database insertion failed:', {
          error: dbError instanceof Error ? dbError.message : 'Unknown error',
          stack: dbError instanceof Error ? dbError.stack : undefined,
          details: dbError,
          query: 'INSERT INTO bookings...',
          params: [
            userId,
            bookingDetails.vehicleId,
            bookingDetails.pickupDateTime,
            bookingDetails.dropoffDateTime,
            totalHours,
            amountInRupees,
            'pending',
            'pending',
            'payment details json',
            bookingDetails.location
          ]
        });
        return NextResponse.json(
          { error: 'Failed to create booking record. Please try again.' },
          { status: 500 }
        );
      }

      const bookingId = bookingResult.rows[0].id;
      logger.info('Booking record created:', { bookingId });

      // Return success response
      return NextResponse.json({
        success: true,
        data: {
          orderId: order.id,
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: amountInPaise,
          currency: 'INR'
        }
      });
    } catch (error) {
      logger.error('Database or Razorpay error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        details: error
      });
      
      // Log the full error object for debugging
      console.error('Full error object:', error);
      
      return NextResponse.json(
        { error: 'Failed to process booking. Please try again.' },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Server error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      details: error
    });
    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    );
  }
} 