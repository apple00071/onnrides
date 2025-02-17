'use client';

import { Toaster } from 'react-hot-toast';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import Script from 'next/script';
import logger from '@/lib/logger';
import Navbar from './components/Navbar';
import { Footer } from '@/components/ui/footer';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Return a loading state that matches the mounted state structure
  if (!mounted) {
    return (
      <SessionProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <div className="flex min-h-screen flex-col">
            <div className="flex-1">
              <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse">Loading...</div>
              </div>
            </div>
          </div>
        </ThemeProvider>
      </SessionProvider>
    );
  }

  return (
    <SessionProvider>
      <Script
        id="razorpay-script"
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => {
          setScriptLoaded(true);
          logger.info('Razorpay script loaded successfully');
        }}
        onError={(e) => {
          logger.error('Failed to load Razorpay script:', e);
        }}
      />
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <div className="flex-1">
            {children}
          </div>
          <Footer />
        </div>
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 5000,
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
} 