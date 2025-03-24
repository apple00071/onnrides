import { Metadata } from 'next';
import MainLayoutClient from './components/MainLayoutClient';
import LocationStructuredData from '@/components/ui/LocationStructuredData';

// Define location data
const locationData = [
  {
    name: 'OnnRides Erragadda',
    streetAddress: 'R S hotel, Metro Station Erragadda, Prem Nagar',
    addressLocality: 'Erragadda, Hyderabad',
    postalCode: '500018',
    latitude: 17.4482,
    longitude: 78.4376,
    areaServed: ['Erragadda', 'SR Nagar', 'ESI', 'Balkampet', 'Ameerpet', 'Sanjeeva Reddy Nagar'],
    openingHours: {
      opens: '09:00',
      closes: '21:00'
    },
    priceRange: '₹₹',
    telephone: '+919182495481'
  },
  {
    name: 'OnnRides Madhapur',
    streetAddress: '1173, Ayyappa Society Main Rd, Ayyappa Society, Mega Hills',
    addressLocality: 'Madhapur, Hyderabad',
    postalCode: '500081',
    latitude: 17.4400,
    longitude: 78.3920,
    areaServed: ['Madhapur', 'Hitec City', 'Gachibowli', 'Jubilee Hills', 'Kondapur', 'Raidurg'],
    openingHours: {
      opens: '09:00',
      closes: '21:00'
    },
    priceRange: '₹₹',
    telephone: '+919182495481'
  }
];

export const metadata: Metadata = {
  title: 'OnnRides - Bike & Vehicle Rental Service in Hyderabad',
  description: 'Rent bikes, scooters & vehicles in Hyderabad at affordable hourly & daily rates. Easy booking, multiple locations in Madhapur & Erragadda.',
  keywords: [
    'bike rental Hyderabad',
    'scooter rental Hyderabad',
    'vehicle rental Hyderabad',
    'Madhapur bike rental',
    'Erragadda bike rental',
    'Hitec City vehicle rental',
    'Gachibowli bike rental',
    'Kondapur vehicle rental',
    'hourly bike rental Hyderabad',
    'daily bike rental Hyderabad',
    'affordable bike rental',
    'two wheeler rent Hyderabad',
    'bike hire near me',
    'OnnRides Hyderabad'
  ],
  openGraph: {
    title: 'OnnRides - Best Bike & Vehicle Rental Service in Hyderabad',
    description: 'Rent bikes, scooters & vehicles in Hyderabad at affordable hourly & daily rates. Multiple locations with easy booking process.',
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
      <MainLayoutClient>{children}</MainLayoutClient>
    </>
  );
} 