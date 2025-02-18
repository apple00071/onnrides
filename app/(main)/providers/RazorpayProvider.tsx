'use client';

import Script from 'next/script';
import logger from '@/lib/logger';
import { toast } from 'react-hot-toast';
import { useEffect, useState } from 'react';

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

export const initializeRazorpayPayment = async (options: PaymentOptions) => {
  try {
    // Simple check for Razorpay
    if (typeof window.Razorpay === 'undefined') {
      // Load Razorpay script dynamically if not loaded
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    }

    return new Promise((resolve, reject) => {
      try {
        const razorpay = new window.Razorpay({
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
              reject(new Error('Payment cancelled'));
            },
            confirm_close: true,
            escape: false
          },
          theme: {
            color: '#f26e24'
          }
        });

        razorpay.on('payment.failed', function (response: any) {
          logger.error('Payment failed:', response.error);
          toast.error('Payment failed. Please try again.');
          reject(new Error('Payment failed'));
        });

        razorpay.open();
      } catch (error) {
        logger.error('Error initializing Razorpay:', error);
        reject(error);
      }
    });
  } catch (error) {
    logger.error('Payment initialization error:', error);
    toast.error('Failed to start payment. Please try again.');
    throw error;
  }
};

function RazorpayScript() {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    // Load Razorpay script on mount
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      logger.info('Razorpay script loaded successfully');
      setScriptLoaded(true);
    };
    script.onerror = (e) => {
      logger.error('Error loading Razorpay script:', e);
      toast.error('Failed to load payment system. Please refresh the page.');
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup script on unmount
      document.body.removeChild(script);
    };
  }, []);

  return null;
}

export default RazorpayScript; 