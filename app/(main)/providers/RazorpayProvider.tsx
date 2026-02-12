'use client';

import Script from 'next/script';
import { toast } from 'sonner';
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
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropClose?: boolean;
    confirm_close?: boolean;
  };
}

const MAX_RETRIES = 50;
const RETRY_INTERVAL = 100;

export const initializeRazorpayPayment = async (options: PaymentOptions) => {
  try {
    // Wait for Razorpay to be available
    let attempts = 0;
    while (typeof window.Razorpay === 'undefined' && attempts < MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL));
      attempts++;
    }

    if (typeof window.Razorpay === 'undefined') {
      throw new Error('Razorpay failed to load');
    }

    logger.debug('Initializing Razorpay payment with options:', {
      key: options.key,
      amount: options.amount,
      orderId: options.orderId,
      bookingId: options.bookingId
    });

    const rzp = new window.Razorpay({
      key: options.key,
      amount: options.amount.toString(),
      currency: options.currency,
      order_id: options.orderId,
      name: 'OnnRides',
      description: `Advance Payment (5%) for Booking ID: ${options.bookingId}`,
      image: '/logo.png',
      prefill: options.prefill,
      notes: { 
        booking_id: options.bookingId,
        payment_type: 'advance_payment',
        payment_percentage: '5'
      },
      theme: {
        color: '#f26e24'
      },
      modal: options.modal || {
        ondismiss: function() {
          logger.debug('Payment modal dismissed');
        },
        escape: true,
        backdropClose: false,
        confirm_close: true
      },
      handler: async function (response: any) {
        try {
          logger.debug('Payment successful, verifying...', response);
          
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

          const result = await verificationResponse.json();
          
          if (result.success) {
            logger.debug('Payment verified successfully');
            window.location.href = '/bookings';
          } else {
            logger.error('Payment verification failed:', result);
            window.location.href = `/payment-status?status=failed&bookingId=${options.bookingId}`;
          }
        } catch (error) {
          logger.error('Error during payment verification:', error);
          window.location.href = `/payment-status?status=failed&bookingId=${options.bookingId}`;
        }
      },
    });

    rzp.on('payment.failed', function (response: any) {
      logger.error('Payment failed:', response.error);
      window.location.href = `/payment-status?status=failed&bookingId=${options.bookingId}`;
    });

    logger.debug('Opening Razorpay modal');
    rzp.open();
  } catch (error) {
    logger.error('Error initializing Razorpay payment:', error);
    toast.error('Failed to initialize payment. Please try again.');
    window.location.href = `/payment-status?status=failed&bookingId=${options.bookingId}`;
  }
};

export default function RazorpayProvider({ children }: { children: React.ReactNode }) {
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    if (typeof window.Razorpay !== 'undefined') {
      setIsScriptLoaded(true);
    }
  }, []);

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
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