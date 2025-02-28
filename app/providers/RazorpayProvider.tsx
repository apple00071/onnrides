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
    // Wait for Razorpay to be available
    await waitForRazorpay();

    // Log payment initialization
    logger.debug('Initializing payment with options:', {
      key: options.key,
      amount: options.amount,
      orderId: options.orderId,
      bookingId: options.bookingId
    });

    return new Promise((resolve, reject) => {
      try {
        const rzp = new window.Razorpay({
          ...options,
          name: 'OnnRides',
          description: `Booking ID: ${options.bookingId}`,
          image: '/logo.png',
          handler: async function (response: any) {
            try {
              logger.debug('Payment successful, verifying...', response);
              
              // Verify payment
              const verificationResponse = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  booking_id: options.bookingId,
                }),
              });

              if (!verificationResponse.ok) {
                const error = await verificationResponse.json();
                throw new Error(error.message || 'Payment verification failed');
              }

              const result = await verificationResponse.json();
              resolve(result);
              
              // Redirect on success
              window.location.href = `/payment-status?booking_id=${options.bookingId}&status=success`;
            } catch (error) {
              logger.error('Payment verification failed:', error);
              reject(error);
              window.location.href = `/payment-status?booking_id=${options.bookingId}&status=failed`;
            }
          },
          modal: {
            ondismiss: function () {
              logger.debug('Payment modal dismissed');
              window.location.href = `/payment-status?booking_id=${options.bookingId}&status=failed`;
            },
            confirm_close: true,
            escape: false
          },
          prefill: options.prefill || {},
          theme: {
            color: '#f26e24',
          },
        });

        rzp.on('payment.failed', function (response: any) {
          logger.error('Payment failed:', response.error);
          window.location.href = `/payment-status?booking_id=${options.bookingId}&status=failed`;
        });

        // Open Razorpay modal
        logger.debug('Opening Razorpay modal');
        rzp.open();
      } catch (error) {
        logger.error('Error creating Razorpay instance:', error);
        reject(error);
      }
    });
  } catch (error) {
    logger.error('Failed to initialize Razorpay payment:', error);
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