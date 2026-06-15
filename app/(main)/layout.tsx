import { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import MainLayoutClient from './components/MainLayoutClient';
import LocationStructuredData from '@/components/ui/LocationStructuredData';
import { locationData } from '@/data/locations';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://misterrides.com'),
  title: {
    default: 'Mister Rides - Best Bike Rental Service in Hyderabad',
    template: '%s | Mister Rides'
  },
  description: 'Rent bikes and scooters in Hyderabad at affordable hourly & daily rates. Easy booking, multiple locations in Madhapur & Erragadda.',
  keywords: [
    'bike rental Hyderabad',
    'scooter rental Hyderabad',
    'Madhapur bike rental',
    'Erragadda bike rental',
    'Hitec City bike rental',
    'Gachibowli bike rental',
    'Kondapur bike rental',
    'hourly bike rental Hyderabad',
    'daily bike rental Hyderabad',
    'affordable bike rental',
    'two wheeler rent Hyderabad',
    'bike hire near me',
    'Mister Rides Hyderabad'
  ],
  openGraph: {
    title: 'Mister Rides - Best Bike Rental Service in Hyderabad',
    description: 'Rent bikes and scooters in Hyderabad at affordable hourly & daily rates. Multiple locations with easy booking process.',
    url: 'https://misterrides.com',
    siteName: 'Mister Rides',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Mister Rides - Bike Rental Service',
      }
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mister Rides - Best Bike Rental Service in Hyderabad',
    description: 'Rent bikes, scooters & vehicles in Hyderabad at affordable rates. Multiple locations with doorstep delivery available.',
    images: ['/images/twitter-image.jpg'],
    creator: '@misterrides',
    site: '@misterrides'
  },
  alternates: {
    canonical: 'https://misterrides.com',
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
  }
};

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <LocationStructuredData locations={locationData} />
      <MainLayoutClient>
        <Container>
          {children}
        </Container>
      </MainLayoutClient>
    </>
  );
} 
