'use client';

import { useEffect, useState } from 'react';
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

// Function to load Razorpay script
const loadRazorpayScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.defer = false;

    script.onload = () => {
      logger.info('Razorpay script loaded successfully');
      resolve();
    };

    script.onerror = () => {
      logger.error('Failed to load Razorpay script');
      reject(new Error('Failed to load Razorpay script'));
    };

    document.body.appendChild(script);
  });
};

// Function to cleanup Razorpay instance
const cleanupRazorpay = () => {
  if (window.razorpayInstance) {
    try {
      window.razorpayInstance.close();
      window.razorpayInstance = null;
      logger.info('Cleaned up Razorpay instance');
    } catch (error) {
      logger.warn('Error cleaning up Razorpay instance:', error);
    }
  }
};

export const initializeRazorpayPayment = async (options: PaymentOptions) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Clean up any existing instance
      cleanupRazorpay();

      // Load Razorpay script if not already loaded
      await loadRazorpayScript();

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
            cleanupRazorpay();

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
            logger.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
            reject(error);
          }
        },
        modal: {
          ondismiss: function() {
            cleanupRazorpay();
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
      cleanupRazorpay();
      logger.error('Payment initialization error:', error);
      toast.error('Failed to start payment. Please try again.');
      reject(error);
    }
  });
};

export default function RazorpayProvider() {
  useEffect(() => {
    // Load Razorpay script when component mounts
    loadRazorpayScript().catch(error => {
      logger.error('Failed to load Razorpay script:', error);
    });

    // Cleanup on unmount
    return () => {
      cleanupRazorpay();
    };
  }, []);

  return null;
} 