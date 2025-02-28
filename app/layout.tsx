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

async function checkMaintenanceMode(): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/maintenance/check`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      console.error('Failed to check maintenance mode:', response.statusText);
      return false;
    }
    const data = await response.json();
    return Boolean(data.maintenance);
  } catch (error) {
    console.error('Error checking maintenance mode:', error);
    return false;
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const headersList = headers();
  const pathname = headersList.get('x-pathname') || '/';
  const isMaintenancePath = pathname.startsWith('/maintenance');
  const isAdminPath = pathname.startsWith('/admin');
  const isApiPath = pathname.startsWith('/api');
  const isNextPath = pathname.startsWith('/_next');

  // Skip maintenance check for certain paths
  if (!isMaintenancePath && !isAdminPath && !isApiPath && !isNextPath) {
    const isMaintenanceMode = await checkMaintenanceMode();
    if (isMaintenanceMode) {
      const { redirect } = await import('next/navigation');
      redirect('/maintenance');
    }
  }

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
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ClientOnly>
          <Providers session={session}>
            <AuthProvider>
              <NotificationBar />
              {children}
              <Toaster position="top-center" />
              <ScriptLoader />
            </AuthProvider>
          </Providers>
        </ClientOnly>
        <JsonLd data={structuredData} />
      </body>
    </html>
  );
}
