'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import logger from '@/lib/logger';
import { toast } from 'react-hot-toast';

declare global {
  interface Window {
    Razorpay: any;
    razorpayInstance: any;
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

// Get the current domain
const getDomain = () => {
  if (typeof window === 'undefined') return '';
  const hostname = window.location.hostname;
  if (hostname.includes('vercel.app')) {
    return 'https://onnrides.vercel.app';
  }
  if (hostname === 'localhost') {
    return 'http://localhost:3000';
  }
  return 'https://onnrides.com';
};

// Function to wait for Razorpay to be available
const waitForRazorpay = (maxAttempts = 10): Promise<void> => {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      if (window.Razorpay) {
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(new Error('Razorpay failed to load'));
      } else {
        setTimeout(check, 1000); // Check every second
      }
    };
    check();
  });
};

export const initializeRazorpayPayment = async (options: PaymentOptions) => {
  try {
    // Wait for Razorpay to be available
    await waitForRazorpay();

    return new Promise((resolve, reject) => {
      try {
        // Clean up any existing Razorpay instance
        if (window.razorpayInstance) {
          try {
            window.razorpayInstance.close();
            window.razorpayInstance = null;
          } catch (error) {
            logger.warn('Error cleaning up Razorpay instance:', error);
          }
        }

        const currentDomain = getDomain();
        logger.info('Initializing payment:', {
          orderId: options.orderId,
          bookingId: options.bookingId,
          amount: options.amount,
          domain: currentDomain
        });

        // Create new Razorpay instance
        window.razorpayInstance = new window.Razorpay({
          key: options.key,
          amount: options.amount,
          currency: options.currency,
          name: 'OnnRides',
          description: `Booking ID: ${options.bookingId}`,
          order_id: options.orderId,
          prefill: {
            name: options.prefill?.name || '',
            email: options.prefill?.email || '',
            contact: options.prefill?.contact || ''
          },
          notes: {
            booking_id: options.bookingId,
            domain: currentDomain
          },
          handler: async function (response: any) {
            try {
              window.razorpayInstance = null;

              logger.info('Payment successful, verifying...', {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id
              });

              const verifyResponse = await fetch(`${currentDomain}/api/payments/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                  booking_id: options.bookingId
                }),
              });

              const verifyData = await verifyResponse.json();
              
              if (!verifyResponse.ok || !verifyData.success) {
                throw new Error(verifyData.error || 'Payment verification failed');
              }

              toast.success('Payment successful!');
              resolve(verifyData);
            } catch (error) {
              window.razorpayInstance = null;
              logger.error('Payment verification error:', error);
              toast.error('Payment verification failed. Please contact support.');
              reject(error);
            }
          },
          modal: {
            ondismiss: function() {
              window.razorpayInstance = null;
              logger.info('Payment modal dismissed');
              reject(new Error('Payment cancelled'));
            },
            confirm_close: true,
            escape: false,
            backdropclose: false,
            animation: true
          },
          theme: {
            color: '#f26e24'
          },
          retry: {
            enabled: true,
            max_count: 3
          }
        });

        logger.info('Opening Razorpay modal');
        window.razorpayInstance.open();
      } catch (error) {
        window.razorpayInstance = null;
        logger.error('Payment initialization error:', error);
        toast.error('Failed to start payment. Please try again.');
        reject(error);
      }
    });
  } catch (error) {
    logger.error('Failed to initialize Razorpay:', error);
    toast.error('Payment system is not ready. Please refresh the page.');
    throw error;
  }
};

export default function RazorpayProvider() {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Check if Razorpay is already loaded
    if (window.Razorpay) {
      setScriptLoaded(true);
    }
  }, []);

  return (
    <Script
      id="razorpay-checkout"
      src="https://checkout.razorpay.com/v1/checkout.js"
      strategy="afterInteractive"
      async={true}
      onLoad={() => {
        logger.info('Razorpay script loaded successfully');
        setScriptLoaded(true);
      }}
      onError={(e) => {
        logger.error('Failed to load Razorpay script:', e);
        toast.error('Failed to load payment system. Please refresh the page.');
      }}
    />
  );
} 