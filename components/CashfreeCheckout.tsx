'use client';

import React from 'react';
import { useEffect } from 'react';
import Script from 'next/script';
import { toast } from 'sonner';
import logger from '@/lib/logger';

interface CashfreeCheckoutProps {
  orderId: string;
  sessionId: string;
  onSuccess: (data: any) => void;
  onFailure: (error: any) => void;
}

declare global {
  interface Window {
    Cashfree: any;
  }
}

export function CashfreeCheckout({ orderId, sessionId, onSuccess, onFailure }: CashfreeCheckoutProps) {
  useEffect(() => {
    const initializePayment = async () => {
      try {
        if (!window.Cashfree) {
          logger.error('Cashfree SDK not loaded');
          return;
        }

        const cashfree = new window.Cashfree();
        const paymentConfig = {
          paymentSessionId: sessionId,
          environment: 'sandbox'
        };

        cashfree.initialiseDropin(document.getElementById("cashfree-payment-container"), paymentConfig);

        // Listen for payment events
        window.addEventListener('payment.success', (event: any) => {
          logger.debug('Payment success:', event.detail);
          onSuccess(event.detail);
        });

        window.addEventListener('payment.failed', (event: any) => {
          logger.error('Payment failed:', event.detail);
          onFailure(event.detail);
        });

      } catch (error) {
        logger.error('Error initializing Cashfree:', error);
        toast.error('Failed to initialize payment. Please try again.');
      }
    };

    initializePayment();

    // Cleanup
    return () => {
      window.removeEventListener('payment.success', onSuccess);
      window.removeEventListener('payment.failed', onFailure);
    };
  }, [orderId, sessionId, onSuccess, onFailure]);

  return (
    <>
      <Script
        src="https://sdk.cashfree.com/js/v3/cashfree.js"
        strategy="beforeInteractive"
      />
      <div 
        id="cashfree-payment-container"
        className="w-full min-h-[400px] border border-gray-200 rounded-lg"
      />
    </>
  );
} 