import HeroSection from '@/components/ui/HeroSection';
import ServicesSection from '@/components/ui/ServicesSection';
import TestimonialsSection from '@/components/ui/TestimonialsSection';
import FleetSection from '@/components/ui/FleetSection';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Best Bike Rental in Hyderabad | Rent Activa & Scooters | Mister Rides',
  description: 'Rent bikes and scooters in Hyderabad starting at ₹199/day. Easy online booking for Activa, Dio, Access & more. Multiple pickup points in Madhapur & Erragadda with zero hidden charges.',
  keywords: 'bike rental Hyderabad, vehicle rental service, two wheeler rent, Activa rental Hyderabad, Madhapur bike rental, Erragadda vehicle rental, scooter rental near me, rent scooter Hyderabad',
  openGraph: {
    title: 'Best Bike Rental in Hyderabad | Rent Activa & Scooters | Mister Rides',
    description: 'Rent bikes and scooters in Hyderabad starting at ₹199/day. Choose from Activa, Dio, Access & more. Multiple pickup points, free delivery, zero hidden charges.',
    url: 'https://misterrides.com',
    siteName: 'Mister Rides',
    locale: 'en_IN',
    type: 'website',
    images: [
      {
        url: 'https://misterrides.com/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Mister Rides Vehicle Rental Service',
      }
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Bike Rental in Hyderabad | Rent Activa & Scooters | Mister Rides',
    description: 'Rent bikes and scooters in Hyderabad starting at ₹199/day. Choose from Activa, Dio, Access & more. Multiple pickup points, free delivery, zero hidden charges.',
    images: ['https://misterrides.com/images/og-image.jpg'],
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
