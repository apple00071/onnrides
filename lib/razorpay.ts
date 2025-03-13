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
    logger.info('Creating Razorpay order:', { 
      amount,
      currency,
      receipt,
      notes
    });

    // Get fresh Razorpay instance
    const razorpay = getRazorpayInstance();
    logger.info('Got Razorpay instance, creating order...');

    // Check if amount is within Razorpay's valid range
    if (typeof amount !== 'number') {
      logger.error('Invalid amount type provided:', { amount, type: typeof amount });
      throw new Error('Invalid amount. Amount must be a number.');
    }
    
    // ALWAYS convert to paise (1 INR = 100 paise)
    // We assume all incoming amounts are in INR (₹) and convert to paise
    const amountInPaise = Math.round(amount * 100);
    
    logger.info('Amount conversion to paise:', {
      originalAmountINR: amount,
      convertedAmountPaise: amountInPaise
    });
    
    // Handle minimum payment requirements for Razorpay
    let paymentAmount = amountInPaise;
    
    // Check if we should skip minimum amount enforcement
    const skipMinimumCheck = notes?.skipMinimumCheck === 'true';
    
    // Only apply minimum amount logic for very small amounts (< 1 INR / 100 paise)
    // AND when not explicitly skipped
    if (amountInPaise < 100 && !skipMinimumCheck) {
      logger.warn('Amount too small for Razorpay minimum:', { 
        originalAmountINR: amount,
        amountInPaise: amountInPaise,
        minimum: 100,
        skipMinimumCheck
      });
      
      // Record the original amount in the payment metadata
      notes = {
        ...notes,
        original_amount: String(amount),
        original_amount_paise: String(amountInPaise),
        is_minimum_payment: 'true',
        amount_adjustment: 'Used minimum payment of ₹1 instead of original amount'
      };
      
      // Use minimum amount required by Razorpay
      paymentAmount = 100; // 1 INR = 100 paise
      
      logger.info('Adjusted payment amount to meet Razorpay minimum:', {
        fromINR: amount,
        fromPaise: amountInPaise,
        toINR: 1,
        toPaise: paymentAmount
      });
    } else {
      // For normal amounts (≥ 1 INR) or when minimum check is skipped
      logger.info('Using original payment amount (no adjustment needed):', {
        amountINR: amount,
        amountPaise: amountInPaise
      });
    }

    // Create order with the amount in paise
    const orderData = {
      amount: paymentAmount,
      currency,
      receipt,
      notes,
    };

    try {
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
    } catch (razorpayError) {
      // Extract and log the detailed error info from Razorpay
      const errorInfo = {
        message: razorpayError instanceof Error ? razorpayError.message : 'Unknown error',
        code: (razorpayError as any)?.code,
        description: (razorpayError as any)?.description,
        field: (razorpayError as any)?.field,
        source: (razorpayError as any)?.source,
        step: (razorpayError as any)?.step,
        reason: (razorpayError as any)?.reason,
        metadata: (razorpayError as any)?.metadata,
        originalError: razorpayError
      };
      
      logger.error('Razorpay API error when creating order:', {
        orderData,
        errorInfo,
        errorString: JSON.stringify(errorInfo)
      });
      
      // Re-throw with enhanced context for better debugging
      throw new Error(`Razorpay order creation failed: ${errorInfo.message || 'Unknown error'}`);
    }
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