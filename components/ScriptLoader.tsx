'use client';

import Script from 'next/script';

export function ScriptLoader() {
  return (
    <Script 
      src="https://sdk.cashfree.com/js/ui/2.0.0/cashfree.prod.js"
      strategy="lazyOnload"
      id="cashfree-script"
    />
  );
} 