import Razorpay from 'razorpay';
import { randomUUID } from 'crypto';
import logger from './logger';
import crypto from 'crypto';

function validateEnvironmentVariables() {
  const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
  const NEXT_PUBLIC_RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET || !NEXT_PUBLIC_RAZORPAY_KEY_ID) {
    throw new Error('Missing required Razorpay environment variables');
  }

  if (NEXT_PUBLIC_RAZORPAY_KEY_ID !== RAZORPAY_KEY_ID) {
    throw new Error('NEXT_PUBLIC_RAZORPAY_KEY_ID must match RAZORPAY_KEY_ID');
  }

  return {
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  };
}

let razorpayInstance: Razorpay | null = null;

export function getRazorpayInstance(): Razorpay {
  if (!razorpayInstance) {
    const { key_id, key_secret } = validateEnvironmentVariables();
    razorpayInstance = new Razorpay({
      key_id,
      key_secret,
    });
  }
  return razorpayInstance;
}

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
    // Validate amount
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('Invalid amount. Amount must be a positive number.');
    }
    
    logger.info('Creating Razorpay order:', { 
      amount,
      currency,
      receipt
    });

    const razorpay = getRazorpayInstance();
    const order = await razorpay.orders.create({
      amount,
      currency,
      receipt,
      notes,
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
    if (!order_id || !payment_id || !signature) {
      logger.error('Missing required verification parameters');
      return false;
    }

    const { key_secret } = validateEnvironmentVariables();
    const text = `${order_id}|${payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', key_secret)
      .update(text)
      .digest('hex');

    const isValid = expectedSignature === signature;

    logger.info('Payment verification result:', {
      orderId: order_id,
      paymentId: payment_id,
      isValid
    });

    return isValid;
  } catch (error) {
    logger.error('Payment verification error:', error);
    return false;
  }
} 