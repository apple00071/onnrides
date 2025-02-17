'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import logger from '@/lib/logger';
import { toast } from 'react-hot-toast';

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

const isBrowserSupported = () => {
  try {
    const ua = window.navigator.userAgent.toLowerCase();
    logger.info('Checking browser compatibility:', { userAgent: ua });
    
    // Check for mobile browsers
    const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
    
    // For mobile devices, be more permissive
    if (isMobile) {
      // Allow all modern mobile browsers
      const isModernMobile = /chrome|safari|firefox|edge|opera|samsung|ucbrowser|miui/i.test(ua);
      logger.info('Mobile browser check:', { 
        isMobile: true, 
        isModernMobile,
        browserType: ua.match(/chrome|safari|firefox|edge|opera|samsung|ucbrowser|miui/i)?.[0] 
      });
      
      // Special handling for WebView browsers
      if (/(webview|wv)/i.test(ua)) {
        logger.info('WebView detected, checking if supported');
        // Allow WebViews from major browsers
        return /chrome|safari|firefox/i.test(ua);
      }
      
      return isModernMobile;
    }

    // For desktop, be more permissive with browser support
    const isModernDesktop = /chrome|firefox|safari|edge|opera|chromium/i.test(ua);
    
    logger.info('Desktop browser check:', { 
      isMobile: false, 
      isModernDesktop,
      browserType: ua.match(/chrome|firefox|safari|edge|opera|chromium/i)?.[0]
    });

    return isModernDesktop;
  } catch (error) {
    logger.error('Error checking browser compatibility:', error);
    // If there's an error in detection, allow the browser
    // Better to try the payment than block unnecessarily
    return true;
  }
};

export const initializeRazorpayPayment = async (options: PaymentOptions) => {
  return new Promise((resolve, reject) => {
    try {
      if (!isBrowserSupported()) {
        const errorMessage = 'This browser may not be fully supported. For the best experience, please use Chrome, Firefox, Safari, or Edge. If you continue to have issues, try using a different browser or contact our support.';
        logger.warn('Browser compatibility warning shown to user');
        toast.error(errorMessage);
        // Don't throw error, just warn and continue
      }

      // Wait for Razorpay to be available
      let attempts = 0;
      const maxAttempts = 5;
      const checkRazorpay = () => {
        if (window.Razorpay) {
          initializePayment();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkRazorpay, 1000);
        } else {
          throw new Error('Payment system failed to load. Please refresh the page or try a different browser.');
        }
      };

      const initializePayment = () => {
        if (!options.bookingId) {
          throw new Error('Booking ID is required');
        }

        const razorpay = new window.Razorpay({
          key: options.key,
          amount: options.amount,
          currency: options.currency,
          name: 'OnnRides',
          description: `Booking ID: ${options.bookingId}`,
          order_id: options.orderId,
          prefill: options.prefill,
          notes: {
            booking_id: options.bookingId
          },
          handler: async function (response: any) {
            try {
              logger.info('Payment successful, verifying...', {
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                bookingId: options.bookingId
              });

              const verifyResponse = await fetch('/api/payments/verify', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
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
              logger.error('Payment verification error:', {
                error,
                bookingId: options.bookingId,
                orderId: response.razorpay_order_id
              });
              toast.error('Payment verification failed. Please contact support.');
              reject(error);
            }
          },
          modal: {
            ondismiss: function() {
              toast.error('Payment cancelled');
              reject(new Error('Payment cancelled by user'));
            },
            confirm_close: true,
            escape: false
          },
          theme: {
            color: '#f26e24',
          },
        });

        razorpay.open();
      };

      checkRazorpay();
    } catch (error) {
      logger.error('Failed to initialize Razorpay:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initialize payment. Please try again.');
      reject(error);
    }
  });
};

export default function RazorpayProvider() {
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (scriptLoaded) {
      logger.info('Razorpay script loaded successfully');
    }
  }, [scriptLoaded]);

  return (
    <Script
      src="https://checkout.razorpay.com/v1/checkout.js"
      strategy="beforeInteractive"
      onLoad={() => setScriptLoaded(true)}
      onError={(e: Error) => {
        logger.error('Failed to load Razorpay script:', e);
        toast.error('Failed to load payment system. Please refresh the page.');
      }}
    />
  );
} 