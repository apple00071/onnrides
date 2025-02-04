import { logger } from '@/lib/logger';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
        <AuthProvider>
          <Providers session={session}>
            <Toaster position="bottom-center" />
            {children}
            <ScriptLoader />
          </Providers>
        </AuthProvider>
      </body>
    </html>
  );
}
