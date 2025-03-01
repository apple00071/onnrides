import type { Metadata } from 'next';
import MainLayoutClient from './components/MainLayoutClient';

export const metadata: Metadata = {
  title: 'OnnRides - Bike & Vehicle Rental Service in Hyderabad',
  description: 'Rent bikes, scooters & vehicles in Hyderabad at affordable hourly & daily rates. Easy booking, multiple locations in Madhapur & Erragadda.',
  keywords: 'bike rental, scooter rental, vehicle rental, Hyderabad, Madhapur, Erragadda, hourly rental, Activa rental, best bike rental, affordable bikes',
  openGraph: {
    title: 'OnnRides - Bike & Vehicle Rental Service in Hyderabad',
    description: 'Rent bikes, scooters & vehicles in Hyderabad at affordable hourly & daily rates. Easy booking, multiple locations in Madhapur & Erragadda.',
    url: 'https://www.onnrides.com',
    siteName: 'OnnRides',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'OnnRides - Bike & Vehicle Rental Service',
      }
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OnnRides - Bike & Vehicle Rental Service in Hyderabad',
    description: 'Rent bikes, scooters & vehicles in Hyderabad at affordable hourly & daily rates. Easy booking, multiple locations.',
    images: ['/images/twitter-image.jpg'],
  },
  alternates: {
    canonical: 'https://www.onnrides.com',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <MainLayoutClient>{children}</MainLayoutClient>;
} 