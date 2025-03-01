import Razorpay from 'razorpay';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';
import crypto from 'crypto';

function validateEnvironmentVariables() {
  const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
  const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Missing required Razorpay environment variables');
  }

  return {
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET
  };
}

// Create a new instance each time to ensure we're using the latest credentials
export function getRazorpayInstance(): Razorpay {
  const { key_id, key_secret } = validateEnvironmentVariables();
  logger.debug('Creating new Razorpay instance with key_id:', key_id);
  return new Razorpay({
    key_id,
    key_secret,
  });
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
    // Validate amount (amount should already be in paise)
    if (typeof amount !== 'number' || amount < 100) { // Minimum amount is 1 INR (100 paise)
      logger.error('Invalid amount provided:', { amount });
      throw new Error('Invalid amount. Amount must be at least 100 paise (1 INR).');
    }
    
    logger.info('Creating Razorpay order:', { 
      amount,
      currency,
      receipt,
      notes
    });

    // Get fresh Razorpay instance
    const razorpay = getRazorpayInstance();
    logger.info('Got Razorpay instance, creating order...');

    // Create order (amount is already in paise)
    const orderData = {
      amount: amount, // Remove Math.round to keep exact amount
      currency,
      receipt,
      notes,
    };

    const order = await razorpay.orders.create(orderData);

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