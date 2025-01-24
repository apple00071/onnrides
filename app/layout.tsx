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
  title: 'OnnRides - Your Perfect Ride',
  description: 'Find and book your perfect ride with OnnRides',
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
      </head>
      <body className={inter.className}>
        <Providers session={session}>
          <Toaster position="top-center" />
          {children}
        </Providers>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
