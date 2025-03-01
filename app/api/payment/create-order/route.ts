import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createOrder } from '@/lib/razorpay';

// New route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<Response> {
  let bookingId: string | null = null;

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Unauthorized',
          details: 'User not authenticated'
        }),
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { amount, vehicleId } = body;
    bookingId = body.bookingId;

    if (!bookingId || !amount || !vehicleId) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Invalid request',
          details: 'Missing required fields: bookingId, amount, or vehicleId'
        }),
        { status: 400 }
      );
    }

    // Validate amount
    const amountInPaise = Math.round(parseFloat(amount) * 100);
    if (isNaN(amountInPaise) || amountInPaise < 100) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Invalid amount',
          details: 'Amount must be at least 1 INR'
        }),
        { status: 400 }
      );
    }

    logger.debug('Creating Razorpay order with:', {
      bookingId,
      vehicleId,
      amount: amount,
      amountInPaise,
      customerId: session.user.id,
      receipt: bookingId
    });

    try {
      const order = await createOrder({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `booking_${bookingId}`,
        notes: {
          booking_id: String(bookingId),
          vehicle_id: String(vehicleId),
          user_id: String(session.user.id)
        }
      });

      logger.debug('Razorpay order created:', order);

      // Update booking with payment details
      await query(
        `UPDATE bookings 
         SET payment_details = $1::jsonb 
         WHERE id = $2`,
        [JSON.stringify({
          razorpay_order_id: order.id,
          amount: amount,
          currency: 'INR',
          created_at: new Date().toISOString()
        }), bookingId]
      );

      return new NextResponse(
        JSON.stringify({
          success: true,
          data: {
            orderId: order.id,
            amount: amountInPaise,
            currency: order.currency,
            bookingId,
            key: process.env.RAZORPAY_KEY_ID
          }
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

    } catch (razorpayError) {
      logger.error('Razorpay error:', razorpayError);
      
      // If Razorpay order creation fails, delete the booking
      if (bookingId) {
        try {
          await query('DELETE FROM bookings WHERE id = $1', [bookingId]);
          logger.debug('Deleted booking after Razorpay error:', { bookingId });
        } catch (deleteError) {
          logger.error('Failed to delete booking:', deleteError);
        }
      }

      return new NextResponse(
        JSON.stringify({
          success: false,
          error: 'Failed to create Razorpay order',
          details: razorpayError instanceof Error ? razorpayError.message : 'Unknown error'
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    }

  } catch (error) {
    logger.error('Error in create-order:', error);
    
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 