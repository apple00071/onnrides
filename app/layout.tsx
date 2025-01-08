import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import './responsive.css';
import { AuthProvider } from '@/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://onnrides.com'),
  title: {
    default: 'OnnRides - Rent Bikes & Cars in India',
    template: '%s | OnnRides'
  },
  description: 'OnnRides offers convenient bike and car rentals across India. Find the perfect vehicle for your journey with our wide selection and competitive prices.',
  keywords: ['bike rental', 'car rental', 'vehicle rental', 'India', 'OnnRides', 'transportation', 'travel', 'rental service'],
  authors: [{ name: 'OnnRides', url: 'https://onnrides.com' }],
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
    url: 'https://onnrides.com',
    title: 'OnnRides - Rent Bikes & Cars in India',
    description: 'OnnRides offers convenient bike and car rentals across India. Find the perfect vehicle for your journey with our wide selection and competitive prices.',
    siteName: 'OnnRides',
    images: [
      {
        url: 'https://onnrides.com/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'OnnRides - Rent Bikes & Cars in India',
      },
    ],
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
  twitter: {
    card: 'summary_large_image',
    title: 'OnnRides - Rent Bikes & Cars in India',
    description: 'OnnRides offers convenient bike and car rentals across India. Find the perfect vehicle for your journey with our wide selection and competitive prices.',
    images: ['https://onnrides.com/og-image.jpg'],
  },
  verification: {
    google: 'your-google-site-verification-code',
  },
  alternates: {
    canonical: 'https://onnrides.com',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
