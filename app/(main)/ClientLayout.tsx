'use client';

import { Toaster } from 'sonner';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import { Footer } from '@/components/ui/footer';
import RazorpayScript from './providers/RazorpayProvider';
import ClientOnly from './providers/ClientOnly';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        enableSystem={false}
        disableTransitionOnChange
      >
        {!mounted ? (
          <>
            <Navbar />
            <div className="min-h-screen flex items-center justify-center">
              <div className="animate-pulse">Loading...</div>
            </div>
            <Footer />
          </>
        ) : (
          <>
            <RazorpayScript />
            <Navbar />
            <main className="min-h-screen">
              {children}
            </main>
            <Footer />
          </>
        )}
      </ThemeProvider>
    </SessionProvider>
  );
} 