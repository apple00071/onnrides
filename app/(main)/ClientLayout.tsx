'use client';

import { Toaster } from 'react-hot-toast';
import { SessionProvider } from 'next-auth/react';
import { ThemeProvider } from 'next-themes';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import { Footer } from '@/components/ui/footer';
import RazorpayProvider from './providers/RazorpayProvider';
import { ScriptLoader } from '@/components/ScriptLoader';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

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
        <RazorpayProvider />
      </ThemeProvider>
    </SessionProvider>
  );
} 