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
import { NotificationBar } from '@/components/ui/NotificationBar';
import JsonLd from './components/JsonLd';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'] });

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
  const session = await getServerSession(authOptions);
  const pathname = headers().get('x-pathname') || '/';
  const isAdminPage = pathname.startsWith('/admin');
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
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Hyderabad',
          addressRegion: 'Telangana',
          addressCountry: 'IN'
        },
        areaServed: {
          '@type': 'City',
          name: 'Hyderabad',
          '@id': 'https://www.wikidata.org/wiki/Q1361'
        },
        sameAs: [
          'https://www.facebook.com/onnrides',
          'https://twitter.com/onnrides',
          'https://www.instagram.com/onnrides',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${baseUrl}/#website`,
        url: baseUrl,
        name: 'OnnRides Hyderabad',
        publisher: {
          '@id': `${baseUrl}/#organization`,
        },
        description: 'Best vehicle rental service in Hyderabad. Rent cars, bikes & scooters with doorstep delivery. Multiple pickup locations, affordable rates.',
      },
      {
        '@type': 'LocalBusiness',
        '@id': `${baseUrl}/#localbusiness`,
        name: 'OnnRides Vehicle Rental Hyderabad',
        image: `${baseUrl}/logo.png`,
        url: baseUrl,
        telephone: process.env.NEXT_PUBLIC_CONTACT_PHONE || '',
        priceRange: '₹₹',
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Hyderabad',
          addressRegion: 'Telangana',
          addressCountry: 'IN'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: '17.385044',
          longitude: '78.486671'
        },
        areaServed: ['Hyderabad', 'Secunderabad', 'Cyberabad'],
        serviceType: ['Vehicle Rental', 'Car Rental', 'Bike Rental'],
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday'
          ],
          opens: '00:00',
          closes: '23:59'
        }
      }
    ],
  };

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
        <JsonLd data={structuredData} />
      </head>
      <body className={inter.className}>
        <Providers session={session}>
          <AuthProvider>
            {!isAdminPage && <NotificationBar />}
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
