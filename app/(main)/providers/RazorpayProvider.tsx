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
  return 'https://onnrides.com';
};

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

      // Log initialization attempt with domain info
      const currentDomain = getDomain();
      logger.info('Initializing payment:', {
        orderId: options.orderId,
        bookingId: options.bookingId,
        amount: options.amount,
        domain: currentDomain,
        hostname: window.location.hostname
      });

      // Initialize payment immediately if Razorpay is available
      if (window.Razorpay) {
        initializePayment();
        return;
      }

      // If Razorpay is not available, load it dynamically
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      
      script.onload = () => {
        logger.info('Razorpay script loaded dynamically');
        initializePayment();
      };
      
      script.onerror = (error) => {
        logger.error('Failed to load Razorpay script dynamically:', error);
        reject(new Error('Failed to load payment system. Please refresh the page.'));
      };
      
      document.body.appendChild(script);

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
              booking_id: options.bookingId,
              domain: currentDomain
            },
            handler: async function (response: any) {
              try {
                window.razorpayInstance = null;

                logger.info('Payment successful, verifying...', {
                  orderId: response.razorpay_order_id,
                  paymentId: response.razorpay_payment_id,
                  domain: currentDomain
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

  // Don't use Next.js Script component to avoid hydration issues
  useEffect(() => {
    const loadScript = () => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      
      script.onload = () => {
        logger.info('Razorpay script loaded');
        setScriptLoaded(true);
      };
      
      script.onerror = (error) => {
        logger.error('Failed to load Razorpay script:', error);
        toast.error('Failed to load payment system. Please refresh the page.');
      };
      
      document.body.appendChild(script);
    };

    loadScript();
  }, []);

  return null;
} 