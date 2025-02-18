'use client';

import Script from 'next/script';
import logger from '@/lib/logger';
import { toast } from 'react-hot-toast';
import { useEffect } from 'react';

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

const waitForRazorpay = (maxAttempts = 10, interval = 1000): Promise<boolean> => {
  return new Promise((resolve) => {
    let attempts = 0;
    const check = () => {
      attempts++;
      if (typeof window.Razorpay !== 'undefined') {
        resolve(true);
      } else if (attempts < maxAttempts) {
        setTimeout(check, interval);
      } else {
        resolve(false);
      }
    };
    check();
  });
};

export const initializeRazorpayPayment = async (options: PaymentOptions) => {
  try {
    // Wait for Razorpay to be loaded
    const isLoaded = await waitForRazorpay();
    if (!isLoaded) {
      throw new Error('Razorpay failed to load');
    }

    // Clean up any existing instance
    if (window.razorpayInstance) {
      try {
        window.razorpayInstance.close();
      } catch (error) {
        logger.warn('Error closing existing Razorpay instance:', error);
      }
      window.razorpayInstance = null;
    }

    return new Promise((resolve, reject) => {
      try {
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
            booking_id: options.bookingId
          },
          handler: async function (response: any) {
            try {
              const verifyResponse = await fetch('/api/payments/verify', {
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

              // Clean up instance after successful payment
              window.razorpayInstance = null;
              toast.success('Payment successful!');
              resolve(verifyData);
            } catch (error) {
              logger.error('Payment verification error:', error);
              toast.error('Payment verification failed. Please contact support.');
              reject(error);
            }
          },
          modal: {
            ondismiss: function() {
              logger.info('Payment modal dismissed');
              window.razorpayInstance = null;
              reject(new Error('Payment cancelled'));
            },
            escape: false,
            animation: false // Disable animations for better stability
          },
          theme: {
            color: '#f26e24'
          }
        });

        window.razorpayInstance.open();
      } catch (error) {
        logger.error('Error initializing Razorpay:', error);
        window.razorpayInstance = null;
        reject(error);
      }
    });
  } catch (error) {
    logger.error('Payment initialization error:', error);
    toast.error('Failed to start payment. Please try again.');
    throw error;
  }
};

export default function RazorpayProvider() {
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (window.razorpayInstance) {
        try {
          window.razorpayInstance.close();
          window.razorpayInstance = null;
        } catch (error) {
          logger.warn('Error cleaning up Razorpay instance:', error);
        }
      }
    };
  }, []);

  return (
    <Script
      id="razorpay-checkout"
      src="https://checkout.razorpay.com/v1/checkout.js"
      strategy="afterInteractive"
      onLoad={() => {
        logger.info('Razorpay script loaded successfully');
      }}
      onError={(e) => {
        logger.error('Error loading Razorpay script:', e);
        toast.error('Failed to load payment system. Please refresh the page.');
      }}
    />
  );
} 