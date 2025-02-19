import '@/lib/polyfills';
import logger from '@/lib/logger';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { AuthProvider } from '@/providers/AuthProvider';
import { ScriptLoader } from '@/components/ScriptLoader';

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OnnRides - Vehicle Rental Service',
  description: 'Your trusted partner for vehicle rentals.',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <head>
        <link 
          rel="preload" 
          href="/fonts/goodtimes.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="anonymous"
        />
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body className={inter.className}>
        <Providers session={session}>
          <AuthProvider>
            <Toaster
              position="bottom-center"
              toastOptions={{
                duration: 5000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  maxWidth: '500px',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                },
                success: {
                  duration: 4000,
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 6000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
              gutter={8}
              containerStyle={{
                bottom: 40,
                inset: '0px',
                maxWidth: '500px',
                margin: '0 auto',
              }}
              reverseOrder={false}
            />
            {children}
            <ScriptLoader />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
