'use client';

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
      // Create new Razorpay instance
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
          }
        },
        theme: {
          color: '#f26e24'
        }
      });

      razorpay.open();
    } catch (error) {
      logger.error('Payment initialization error:', error);
      toast.error('Failed to start payment. Please try again.');
      reject(error);
    }
  });
};

export default function RazorpayProvider() {
  return (
    <Script
      id="razorpay-checkout"
      src="https://checkout.razorpay.com/v1/checkout.js"
      strategy="beforeInteractive"
    />
  );
} 