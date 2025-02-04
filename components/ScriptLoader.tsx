'use client';

import Script from 'next/script';

export function ScriptLoader() {
  return (
    <>
      <Script 
        src="https://sdk.cashfree.com/js/ui/2.0.0/cashfree.prod.js"
        strategy="lazyOnload"
        id="cashfree-script"
      />
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="beforeInteractive"
        id="razorpay-script"
        onLoad={() => {
          console.log('Razorpay script loaded');
        }}
        onError={(e) => {
          console.error('Error loading Razorpay script:', e);
        }}
      />
    </>
  );
} 