import { logger } from '@/lib/logger';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import Script from 'next/script';

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
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    logger.error('Session error:', error);
    session = null;
  }

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
      </head>
      <body className={inter.className}>
        <Providers session={session}>
          <Toaster position="top-center" />
          {children}
          <Script 
            src="https://checkout.razorpay.com/v1/checkout.js"
            strategy="lazyOnload"
            id="razorpay-script"
          />
        </Providers>
      </body>
    </html>
  );
}
