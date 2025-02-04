import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!
});

// Add Razorpay order type
interface RazorpayOrder {
  id: string;
  amount: number;
  amount_paid: number;
  status: string;
  currency: string;
  receipt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { orderId } = params;
    if (!orderId) {
      return NextResponse.json({
        success: false,
        error: 'Order ID is required'
      }, { status: 400 });
    }

    // Get order status from Razorpay
    const order = await razorpay.orders.fetch(orderId) as RazorpayOrder;
    
    if (!order) {
      logger.error('Order not found:', orderId);
      return NextResponse.json({
        success: false,
        error: 'Order not found'
      }, { status: 404 });
    }

    logger.info('Razorpay order status:', {
      orderId,
      status: order.status,
      amount: order.amount,
      amountPaid: order.amount_paid
    });

    // Get booking details
    const bookingResult = await query(
      `SELECT id, status, payment_status, payment_details 
       FROM bookings 
       WHERE payment_details->>'razorpay_order_id' = $1`,
      [orderId]
    );

    if (bookingResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      }, { status: 404 });
    }

    const booking = bookingResult.rows[0];

    const responseData = {
      success: true,
      data: {
        orderId: order.id,
        orderStatus: order.status,
        amount: order.amount / 100, // Convert from paise to rupees
        amountPaid: order.amount_paid / 100,
        currency: order.currency,
        receipt: order.receipt,
        bookingId: booking.id,
        bookingStatus: booking.status,
        paymentStatus: booking.payment_status,
        paymentDetails: booking.payment_details
      }
    };

    logger.info('Sending response:', responseData);
    return NextResponse.json(responseData);

  } catch (error) {
    logger.error('Status check error:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      success: false,
      error: 'Status check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 