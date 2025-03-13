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
    // Validate amount before proceeding
    if (amount === undefined || amount === null) {
      throw new Error('Amount is required for order creation');
    }
    
    // Ensure amount is a number
    const numericAmount = Number(amount);
    if (isNaN(numericAmount)) {
      throw new Error(`Invalid amount: ${amount}. Amount must be a valid number.`);
    }
    
    // Convert to paise (smallest currency unit)
    let amountInPaise = Math.round(numericAmount * 100);
    
    // Handle small amounts (for 5% advance payments with small bookings)
    // Razorpay requires minimum 100 paise (1 INR)
    if (amountInPaise < 100) {
      logger.warn('Amount too small for Razorpay standard minimums:', {
        originalAmount: amount,
        amountInPaise,
        minRequired: 100
      });
      
      // If advance is very small (< ₹1), use a token amount of ₹1
      // We'll record the actual advance in the payment metadata
      const adjustedAmount = 100; // 1 INR in paise
      
      logger.info('Using token amount for Razorpay with original recorded in metadata:', {
        original: amountInPaise,
        adjusted: adjustedAmount
      });
      
      // Add special note about the adjustment
      notes = {
        ...notes,
        original_amount: String(amountInPaise),
        is_token_payment: 'true'
      };
      
      // Use the adjusted minimum amount
      amountInPaise = adjustedAmount;
    }
    
    logger.info('Creating Razorpay order:', { 
      originalAmount: amount,
      amountInPaise,
      currency, 
      receipt: receipt.substring(0, 8) + '...',
      notesKeys: Object.keys(notes)
    });

    const order = await razorpay.orders.create({
      amount: amountInPaise,
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
    // Log detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error && (error as any).details ? (error as any).details : {};
    
    logger.error('Error creating Razorpay order:', {
      error: errorMessage,
      details: errorDetails,
      amount,
      currency,
      receiptPrefix: receipt.substring(0, 8) + '...',
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Re-throw with enhanced information
    if (error instanceof Error) {
      error.message = `Razorpay order creation failed: ${error.message}`;
      throw error;
    }
    throw new Error(`Razorpay order creation failed: ${errorMessage}`);
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
