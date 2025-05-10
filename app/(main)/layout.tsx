import { Metadata } from 'next';
import { Container } from '@/components/layout/Container';
import MainLayoutClient from './components/MainLayoutClient';
import LocationStructuredData from '@/components/ui/LocationStructuredData';
import { locationData } from '@/data/locations';

export const metadata: Metadata = {
  title: 'OnnRides - Bike Rental Service in Hyderabad',
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
    'OnnRides Hyderabad'
  ],
  openGraph: {
    title: 'OnnRides - Best Bike Rental Service in Hyderabad',
    description: 'Rent bikes and scooters in Hyderabad at affordable hourly & daily rates. Multiple locations with easy booking process.',
    url: 'https://www.onnrides.com',
    siteName: 'OnnRides',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'OnnRides - Bike Rental Service',
      }
    ],
    locale: 'en_IN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OnnRides - Best Bike Rental Service in Hyderabad',
    description: 'Rent bikes, scooters & vehicles in Hyderabad at affordable rates. Multiple locations with doorstep delivery available.',
    images: ['/images/twitter-image.jpg'],
    creator: '@onnrides',
    site: '@onnrides'
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
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
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