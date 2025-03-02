import '@/lib/polyfills';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { Providers } from './providers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AuthProvider } from './providers/AuthProvider';
import { ScriptLoader } from '@/components/ScriptLoader';
import { NotificationBar } from '@/components/ui/NotificationBar';
import JsonLd from './components/JsonLd';
import { headers } from 'next/headers';
import ClientOnly from './(main)/providers/ClientOnly';
import logger from '@/lib/logger';
import { cn } from '@/lib/utils';
import GoogleAnalytics from './components/GoogleAnalytics';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'] });

// GA Measurement ID - replace with your actual Google Analytics ID
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
// Only use Google Analytics in production
const isProduction = process.env.NODE_ENV === 'production';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://onnrides.com'),
  title: {
    default: 'OnnRides - Vehicle Rental Service in Hyderabad | Car & Bike Rentals',
    template: '%s | OnnRides Hyderabad'
  },
  description: 'Best vehicle rental service in Hyderabad. Rent cars, bikes & scooters with doorstep delivery. Affordable hourly rates, multiple pickup locations across Hyderabad. Book now!',
  keywords: [
    'vehicle rental Hyderabad',
    'car rental Hyderabad',
    'bike rental Hyderabad',
    'rent vehicles Hyderabad',
    'car hire Hyderabad',
    'bike hire Hyderabad',
    'self drive cars Hyderabad',
    'two wheeler rental Hyderabad',
    'cheap car rental Hyderabad',
    'best bike rental Hyderabad',
    'vehicle rental near me',
    'OnnRides Hyderabad'
  ],
  authors: [{ name: 'OnnRides' }],
  creator: 'OnnRides',
  publisher: 'OnnRides',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: 'OnnRides - Best Vehicle Rental Service in Hyderabad',
    description: 'Top-rated vehicle rental service in Hyderabad. Rent cars, bikes & scooters with doorstep delivery. Multiple pickup locations, affordable rates. Book now!',
    siteName: 'OnnRides Hyderabad',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'OnnRides - Vehicle Rental Service in Hyderabad',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OnnRides - Vehicle Rental Service',
    description: 'Your trusted partner for hassle-free vehicle rentals. Book cars, bikes, and more with easy online booking and doorstep delivery.',
    images: ['/og-image.jpg'],
    creator: '@onnrides',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  },
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL,
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    const session = await getServerSession(authOptions);
    
    // Note: Maintenance mode redirection is now handled by middleware.ts
    // We don't need to check for maintenance mode here anymore
    
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://onnrides.com';
    const structuredData = {
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${baseUrl}/#organization`,
          name: 'OnnRides Hyderabad',
          url: baseUrl,
          logo: {
            '@type': 'ImageObject',
            url: `${baseUrl}/logo.png`,
          }
        }
      ]
    };

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
          {/* Only include Google Analytics in production */}
          {isProduction && GA_MEASUREMENT_ID && <GoogleAnalytics GA_MEASUREMENT_ID={GA_MEASUREMENT_ID} />}
        </head>
        <body className={cn(inter.className)} suppressHydrationWarning>
          <Providers session={session}>
            <AuthProvider>
              <ClientOnly>
                <NotificationBar />
                {children}
                <Toaster position="top-center" />
                <ScriptLoader />
              </ClientOnly>
            </AuthProvider>
          </Providers>
          <JsonLd data={structuredData} />
        </body>
      </html>
    );
  } catch (error) {
    // Error fallback to ensure we always render something
    logger.error('Error in root layout:', error);
    
    return (
      <html lang="en">
        <body className={cn(inter.className)}>
          <div className="flex min-h-screen flex-col items-center justify-center p-24">
            <div className="max-w-5xl w-full">
              <h1 className="text-4xl font-bold mb-4">OnnRides</h1>
              <div className="bg-white shadow-md rounded-lg p-6">
                {children}
              </div>
            </div>
          </div>
        </body>
      </html>
    );
  }
}
