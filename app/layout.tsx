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
import ClientOnly from './(main)/providers/ClientOnly';
import logger from '@/lib/logger';
import { cn, suppressHydrationWarning } from '@/lib/utils';
import GoogleAnalytics from './components/GoogleAnalytics';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Toaster as UiToaster } from '@/components/ui/toaster';
import nextDynamic from 'next/dynamic';
import { SidebarProvider } from '@/hooks/use-sidebar';

// Import ErrorBoundary dynamically with no SSR
const ErrorBoundary = nextDynamic(
  () => import('@/components/ErrorBoundary'),
  { ssr: false }
);

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const inter = Inter({ subsets: ['latin'] });

// GA Measurement ID - replace with your actual Google Analytics ID
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';
// Only use Google Analytics in production
const isProduction = process.env.NODE_ENV === 'production';

// Default robot rules that are safe during build time
const defaultRobotRules = {
  index: process.env.VERCEL_ENV === 'production',
  follow: process.env.VERCEL_ENV === 'production',
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://onnrides.com'),
  title: 'Best Bike Rental in Hyderabad | Activa on Rent | Honda Dio Rental | OnnRides',
  description: 'Top-rated bike rental service in Hyderabad. Rent Activa at ₹199/day, Honda Dio, Access & more. Multiple pickup points in Madhapur, Gachibowli & Erragadda. ✓Hourly Rental ✓Free Delivery ✓No Hidden Charges',
  keywords: [
    'bike rental in hyderabad',
    'bike for rent in hyderabad',
    'activa on rent in hyderabad',
    'bike rental near me',
    'two wheeler for rent in hyderabad',
    'bike rent in madhapur',
    'bike rental gachibowli',
    'erragadda bike rental',
    'honda activa rental hyderabad',
    'bike rental service hyderabad',
    'two wheeler rental hyderabad',
    'bike on rent near me',
    'scooter rental hyderabad',
    'hourly bike rental hyderabad',
    'monthly bike rental hyderabad',
    'cheap bike rental hyderabad',
    'best bike rental in hyderabad',
    'OnnRides bike rental'
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
    locale: 'en_IN',
    url: process.env.NEXT_PUBLIC_APP_URL,
    title: 'Best Bike Rental in Hyderabad | Starting ₹199/day | OnnRides',
    description: '🏍️ Rent bikes in Hyderabad at best prices. ✓Activa ✓Dio ✓Access ✓Free Delivery ✓No Deposit. Multiple locations in Madhapur & Erragadda. Book Now!',
    siteName: 'OnnRides Hyderabad',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'OnnRides - Best Bike Rental Service in Hyderabad',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Bike Rental in Hyderabad | Starting ₹199/day',
    description: '🏍️ Rent Activa, Dio & more in Hyderabad. ✓Hourly/Daily/Monthly Options ✓Multiple Locations ✓Free Delivery. Book Now!',
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
    canonical: 'https://onnrides.com'
  },
  icons: {
    icon: [
      { url: '/favicon/favicon.ico' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/favicon/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/favicon/safari-pinned-tab.svg',
        color: '#f26e24'
      },
    ]
  },
  appleWebApp: {
    title: 'OnnRides',
    statusBarStyle: 'black-translucent',
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
    
    // Enhanced structured data
    const structuredDataItems = [
      // Organization schema
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${baseUrl}/#organization`,
        name: 'OnnRides Hyderabad',
        url: baseUrl,
        logo: {
          '@type': 'ImageObject',
          url: `${baseUrl}/logo.png`,
        },
        contactPoint: [
          {
            '@type': 'ContactPoint',
            telephone: '+91-8247494622',
            contactType: 'customer service',
            areaServed: 'Hyderabad',
            availableLanguage: ['English', 'Hindi', 'Telugu']
          }
        ],
        sameAs: [
          'https://www.facebook.com/onnrides',
          'https://www.instagram.com/onnrides',
          'https://twitter.com/onnrides'
        ]
      },
      
      // Local Business schema
      {
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        '@id': `${baseUrl}/#localbusiness`,
        name: 'OnnRides Vehicle Rental',
        image: `${baseUrl}/logo.png`,
        url: baseUrl,
        telephone: '+91-8247494622',
        priceRange: '₹₹',
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Hyderabad',
          addressLocality: 'Hyderabad',
          addressRegion: 'Telangana',
          postalCode: '500000',
          addressCountry: 'IN'
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: 17.385044,
          longitude: 78.486671
        },
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [
            'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
          ],
          opens: '09:00',
          closes: '21:00'
        }
      },
      
      // Service schema
      {
        '@context': 'https://schema.org',
        '@type': 'Service',
        '@id': `${baseUrl}/#service`,
        name: 'Vehicle Rental Services',
        provider: {
          '@type': 'Organization',
          '@id': `${baseUrl}/#organization`
        },
        areaServed: {
          '@type': 'City',
          name: 'Hyderabad'
        },
        serviceType: ['Car Rental', 'Bike Rental', 'Scooter Rental'],
        description: 'Best vehicle rental service in Hyderabad. Rent cars, bikes & scooters with doorstep delivery. Affordable hourly rates, multiple pickup locations across Hyderabad.',
        offers: {
          '@type': 'AggregateOffer',
          priceCurrency: 'INR',
          lowPrice: '199',
          highPrice: '2999',
          offerCount: '50+'
        }
      },
      
      // FAQ schema
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        '@id': `${baseUrl}/#faqpage`,
        mainEntity: [
          {
            '@type': 'Question',
            name: 'What documents do I need to rent a vehicle?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'You need a valid driving license, Aadhar card or any government-issued ID proof, and a security deposit.'
            }
          },
          {
            '@type': 'Question',
            name: 'Do you offer doorstep delivery?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Yes, we offer doorstep delivery and pickup services across Hyderabad for your convenience.'
            }
          },
          {
            '@type': 'Question',
            name: 'How can I make a payment?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'We accept payments through credit/debit cards, UPI, and online banking. Payment is secured through Razorpay.'
            }
          },
          {
            '@type': 'Question',
            name: 'What is your cancellation policy?',
            acceptedAnswer: {
              '@type': 'Answer',
              text: 'Cancellations made 24 hours before the booking start time receive a full refund. Later cancellations may be subject to charges.'
            }
          }
        ]
      }
    ];

    return (
      <html lang="en" {...suppressHydrationWarning()}>
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta
            name="format-detection"
            content="telephone=no, date=no, email=no, address=no"
          />
          {/* High priority favicon links */}
          <link rel="shortcut icon" href="/favicon/favicon.ico" />
          <link rel="icon" href="/favicon/favicon.ico" sizes="any" />
          <link rel="icon" href="/favicon/favicon-32x32.png" type="image/png" sizes="32x32" />
          <link rel="icon" href="/favicon/android-chrome-192x192.png" type="image/png" sizes="192x192" />
          <link rel="icon" href="/favicon/android-chrome-512x512.png" type="image/png" sizes="512x512" />
          <link rel="apple-touch-icon" href="/favicon/apple-touch-icon.png" />
          <link 
            rel="preload" 
            href="/fonts/goodtimes.woff2" 
            as="font" 
            type="font/woff2" 
            crossOrigin="anonymous"
          />
          {/* Only include Google Analytics in production */}
          {isProduction && GA_MEASUREMENT_ID && <GoogleAnalytics GA_MEASUREMENT_ID={GA_MEASUREMENT_ID} />}
        </head>
        <body className={cn(inter.className)} {...suppressHydrationWarning()}>
          <ErrorBoundary>
            <Providers session={session}>
              <AuthProvider>
                <ClientOnly>
                  <NotificationBar />
                  <SidebarProvider>
                    {children}
                  </SidebarProvider>
                  <Toaster position="top-center" />
                  <ScriptLoader />
                </ClientOnly>
              </AuthProvider>
            </Providers>
          </ErrorBoundary>
          <JsonLd data={structuredDataItems} />
          <SpeedInsights />
          <UiToaster />
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
          <SpeedInsights />
        </body>
      </html>
    );
  }
}
