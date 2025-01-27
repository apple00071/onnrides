import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { createOrder } from '@/lib/razorpay';
import { 
  ApiResponse, 
  Booking, 
  RazorpayOrderResponse, 
  PaymentDetails,
  DbQueryResult 
} from '@/lib/types';

export async function POST(
  request: NextRequest
): Promise<NextResponse<ApiResponse<RazorpayOrderResponse>>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      } as ApiResponse<never>, { status: 401 });
    }

    const { bookingId } = await request.json();
    if (!bookingId) {
      return NextResponse.json({
        success: false,
        error: 'Booking ID is required'
      } as ApiResponse<never>, { status: 400 });
    }

    const bookingResult: DbQueryResult<Booking> = await query<Booking>(
      'SELECT * FROM bookings WHERE id = $1 AND user_id = $2 LIMIT 1',
      [bookingId, session.user.id]
    );

    const booking = bookingResult.rows[0];
    if (!booking) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      } as ApiResponse<never>, { status: 404 });
    }

    const razorpayOrder = await createOrder({
      amount: Math.round(Number(booking.total_price) * 100),
      currency: 'INR',
      receipt: bookingId,
      notes: {
        booking_id: bookingId,
        user_id: session.user.id
      }
    });

    const paymentDetails: PaymentDetails = {
      order_id: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      status: razorpayOrder.status,
      created_at: new Date().toISOString()
    };

    await query<void>(
      `UPDATE bookings 
       SET payment_details = $1::jsonb, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $2`,
      [JSON.stringify(paymentDetails), bookingId]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      }
    } as ApiResponse<RazorpayOrderResponse>);

  } catch (error) {
    logger.error('Error creating order:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create payment order'
    } as ApiResponse<never>, { status: 500 });
  }
}