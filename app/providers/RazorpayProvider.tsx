'use client';

import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import { useState, useEffect } from 'react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface PaymentOptions {
  key: string;
  amount: number;
  currency: string;
  orderId: string;
  bookingId: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
}

const MAX_RETRIES = 5;
const RETRY_DELAY = 1000;

async function waitForRazorpay(retries = 0): Promise<boolean> {
  if (typeof window.Razorpay !== 'undefined') {
    return true;
  }

  if (retries >= MAX_RETRIES) {
    throw new Error('Razorpay failed to load');
  }

  await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
  return waitForRazorpay(retries + 1);
}

export const initializeRazorpayPayment = async (options: PaymentOptions) => {
  try {
    logger.info('Initializing Razorpay payment', {
      orderId: options.orderId,
      bookingId: options.bookingId,
      amount: options.amount,
      amountInRupees: options.amount / 100 // Log amount in rupees for clarity
    });

    // Ensure Razorpay is loaded
    const isLoaded = await waitForRazorpay();
    if (!isLoaded) {
      logger.error('Failed to load Razorpay checkout');
      throw new Error('Failed to load Razorpay checkout');
    }

    // Create Razorpay instance
    const rzp = new window.Razorpay({
      key: options.key,
      amount: options.amount,
      currency: options.currency || 'INR',
      name: 'OnnRides',
      description: `Booking ID: ${options.bookingId}`,
      order_id: options.orderId,
      prefill: options.prefill || {},
      image: `${window.location.origin}/favicon-192.png`,
      theme: {
        color: '#f26e24',
      },
      handler: async function (response: any) {
        // Log complete response for debugging
        logger.info('Razorpay payment callback received', {
          response,
          bookingId: options.bookingId,
          hasPaymentId: !!response.razorpay_payment_id,
          hasOrderId: !!response.razorpay_order_id,
          hasSignature: !!response.razorpay_signature,
        });

        // Check for payment ID at minimum
        if (!response.razorpay_payment_id) {
          logger.error('Payment ID missing from Razorpay response', { 
            response,
            bookingId: options.bookingId
          });
          
          window.location.href = `/payment-status?status=failed&error=missing_payment_id&booking_id=${options.bookingId}`;
          return;
        }

        try {
          // Log verification attempt
          logger.info('Attempting payment verification', {
            paymentId: response.razorpay_payment_id,
            bookingId: options.bookingId
          });

          // Send complete data to server (even if some fields are missing)
          const verifyResult = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id || null,
              razorpay_signature: response.razorpay_signature || null,
              booking_id: options.bookingId,
            }),
          });

          const verifyData = await verifyResult.json();

          // Log verification result
          logger.info('Payment verification response', {
            status: verifyResult.status,
            success: verifyData.success,
            message: verifyData.message,
            paymentId: response.razorpay_payment_id,
            bookingId: options.bookingId
          });

          if (verifyResult.ok && verifyData.success) {
            // Success case
            window.location.href = `/payment-status?status=success&booking_id=${options.bookingId}&payment_id=${response.razorpay_payment_id}`;
          } else {
            // Failed verification
            logger.error('Payment verification failed', {
              status: verifyResult.status,
              error: verifyData.error,
              details: verifyData.details,
              paymentId: response.razorpay_payment_id
            });
            
            window.location.href = `/payment-status?status=failed&error=verification_failed&booking_id=${options.bookingId}&payment_id=${response.razorpay_payment_id}`;
          }
        } catch (error) {
          // Log fetch/verification errors
          logger.error('Error during payment verification fetch', {
            error: error instanceof Error ? {
              message: error.message,
              stack: error.stack
            } : String(error),
            paymentId: response.razorpay_payment_id,
            bookingId: options.bookingId
          });
          
          window.location.href = `/payment-status?status=failed&error=verification_error&booking_id=${options.bookingId}&payment_id=${response.razorpay_payment_id}`;
        }
      },
      modal: {
        ondismiss: function() {
          logger.info('Razorpay modal dismissed', { bookingId: options.bookingId });
          window.location.href = `/payment-status?status=cancelled&booking_id=${options.bookingId}`;
        },
        // Required in Android to access HDFC bank gateway
        escape: false
      },
    });

    // Open payment modal
    logger.info('Opening Razorpay payment modal', { 
      bookingId: options.bookingId,
      orderId: options.orderId
    });
    rzp.open();
    
    return true;
  } catch (error) {
    // Log initialization errors
    logger.error('Error initializing Razorpay payment', {
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack
      } : String(error),
      bookingId: options.bookingId,
      orderId: options.orderId
    });
    
    throw error;
  }
};

export default function RazorpayProvider({ children }: { children: React.ReactNode }) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    // Check if Razorpay is already loaded
    if (typeof window.Razorpay !== 'undefined') {
      setIsScriptLoaded(true);
    }
  }, []);

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="beforeInteractive"
        onLoad={() => {
          logger.debug('Razorpay script loaded successfully');
          setIsScriptLoaded(true);
        }}
        onError={(e) => {
          logger.error('Failed to load Razorpay script:', e);
          toast.error('Failed to load payment system. Please refresh the page.');
        }}
      />
      {children}
    </>
  );
} 