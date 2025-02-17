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

export const initializeRazorpayPayment = async (options: PaymentOptions) => {
  return new Promise((resolve, reject) => {
    try {
      // Clean up any existing Razorpay instance
      if (window.razorpayInstance) {
        try {
          window.razorpayInstance.close();
          window.razorpayInstance = null;
        } catch (cleanupError) {
          logger.warn('Error cleaning up previous Razorpay instance:', cleanupError);
        }
      }

      // Log initialization attempt
      logger.info('Initializing payment:', {
        orderId: options.orderId,
        bookingId: options.bookingId,
        amount: options.amount
      });

      // Initialize payment immediately if Razorpay is available
      if (window.Razorpay) {
        initializePayment();
        return;
      }

      // If Razorpay is not available, wait for it
      let attempts = 0;
      const maxAttempts = 10;
      const checkInterval = setInterval(() => {
        attempts++;
        
        if (window.Razorpay) {
          clearInterval(checkInterval);
          initializePayment();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          const error = new Error('Payment system not available. Please refresh the page.');
          logger.error('Failed to load Razorpay:', { attempts });
          reject(error);
          toast.error(error.message);
        }
      }, 1000);

      function initializePayment() {
        try {
          // Create new Razorpay instance with all required options
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
                window.razorpayInstance = null;

                logger.info('Payment successful, verifying...', {
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id
                });

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
          logger.error('Error initializing payment:', error);
          toast.error('Failed to initialize payment. Please try again.');
          reject(error);
        }
      }
    } catch (error) {
      window.razorpayInstance = null;
      logger.error('Payment initialization error:', error);
      toast.error('Failed to start payment. Please try again.');
      reject(error);
    }
  });
};

export default function RazorpayProvider() {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
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
      id="razorpay-script"
      src="https://checkout.razorpay.com/v1/checkout.js"
      strategy="beforeInteractive"
      onLoad={() => {
        logger.info('Razorpay script loaded');
        setScriptLoaded(true);
      }}
      onError={(e) => {
        logger.error('Failed to load Razorpay script:', e);
        toast.error('Failed to load payment system. Please refresh the page.');
      }}
    />
  );
} 