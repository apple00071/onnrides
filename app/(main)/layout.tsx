import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import ClientLayout from './ClientLayout';
import RazorpayProvider from './providers/RazorpayProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OnnRides - Vehicle Rental Service',
  description: 'Your trusted partner for vehicle rentals.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta
          name="format-detection"
          content="telephone=no, date=no, email=no, address=no"
        />
        <link 
          rel="preload" 
          href="/fonts/Good Times Rg.woff2" 
          as="font" 
          type="font/woff2" 
          crossOrigin="anonymous"
        />
      </head>
      <body className={`${inter.className} min-h-screen bg-background`} suppressHydrationWarning>
        <RazorpayProvider>
          <ClientLayout>{children}</ClientLayout>
        </RazorpayProvider>
      </body>
    </html>
  );
} 