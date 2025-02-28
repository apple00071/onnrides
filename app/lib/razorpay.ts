import Razorpay from 'razorpay';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';
import crypto from 'crypto';

if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  throw new Error('RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be set in environment variables');
}

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export interface CreateOrderParams {
  amount: number;
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrder {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string | null;
  status: 'created' | 'attempted' | 'paid';
  attempts: number;
  notes: Record<string, string | number | null>;
  created_at: number;
}

export async function createOrder({
  amount,
  currency = 'INR',
  receipt = randomUUID(),
  notes = {},
}: CreateOrderParams): Promise<RazorpayOrder> {
  try {
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100), // Convert to smallest currency unit (paise)
      currency,
      receipt,
      notes,
      payment_capture: false // Disable automatic capture
    });

    // Convert string amounts to numbers and ensure correct types
    const processedOrder: RazorpayOrder = {
      id: order.id,
      entity: order.entity,
      amount: Number(order.amount),
      amount_paid: Number(order.amount_paid),
      amount_due: Number(order.amount_due),
      currency: order.currency,
      receipt: order.receipt || null,
      status: order.status as RazorpayOrder['status'],
      attempts: order.attempts,
      notes: order.notes || {},
      created_at: Number(order.created_at),
    };

    logger.info('Created Razorpay order:', { 
      orderId: processedOrder.id, 
      amount: processedOrder.amount, 
      currency: processedOrder.currency 
    });
    
    return processedOrder;
  } catch (error) {
    logger.error('Error creating Razorpay order:', error);
    throw error;
  }
}

export interface PaymentVerificationParams {
  order_id: string;
  payment_id: string;
  signature: string;
}

export function validatePaymentVerification({
  order_id,
  payment_id,
  signature,
}: PaymentVerificationParams): boolean {
  try {
    const text = `${order_id}|${payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest('hex');

    const isValid = expectedSignature === signature;

    logger.info('Payment verification result:', {
      orderId: order_id,
      paymentId: payment_id,
      isValid,
    });

    return isValid;
  } catch (error) {
    logger.error('Error verifying payment:', error);
    return false;
  }
} 