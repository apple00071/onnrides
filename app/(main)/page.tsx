import HeroSection from '@/components/ui/HeroSection';
import ServicesSection from '@/components/ui/ServicesSection';
import TestimonialsSection from '@/components/ui/TestimonialsSection';
import FleetSection from '@/components/ui/FleetSection';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OnnRides - Best Bike & Vehicle Rental Service in Hyderabad',
  description: 'Rent bikes, scooters & vehicles in Hyderabad at affordable rates. Multiple locations in Madhapur & Erragadda with hourly, daily & weekly rental options.',
  keywords: 'bike rental Hyderabad, vehicle rental service, two wheeler rent, Activa rental Hyderabad, Madhapur bike rental, Erragadda vehicle rental, scooter rental near me',
  openGraph: {
    title: 'OnnRides - Affordable Bike & Vehicle Rental in Hyderabad',
    description: 'Rent bikes, scooters & vehicles in Hyderabad. Hourly, daily & weekly rentals with free delivery available.',
    url: 'https://www.onnrides.com',
    siteName: 'OnnRides',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: 'https://www.onnrides.com/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'OnnRides Vehicle Rental Service',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OnnRides - Bike Rental Service in Hyderabad',
    description: 'Rent bikes, scooters & vehicles in Hyderabad at affordable rates. Multiple locations with easy booking process.',
    images: ['https://www.onnrides.com/images/og-image.jpg'],
  },
};

export default function Home() {
  return (
    <div className="space-y-16 py-0">
      <HeroSection />
      <FleetSection />
      <ServicesSection />
      <TestimonialsSection />
    </div>
  );
}