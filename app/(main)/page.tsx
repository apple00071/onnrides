import HeroSection from '@/components/ui/HeroSection';
import ServicesSection from '@/components/ui/ServicesSection';
import TestimonialsSection from '@/components/ui/TestimonialsSection';
import FleetSection from '@/components/ui/FleetSection';
import { BikeRentalFAQ } from '@/components/ui/BikeRentalFAQ';
import Link from 'next/link';
import { MapPin, Shield, IndianRupee } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bike Rental in Hyderabad | Rent Activa & Scooters | Mister Rides',
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
  alternates: {
    canonical: '/',
  },
};

export default function Home() {
  return (
    <div className="space-y-16 py-0">
      <HeroSection />
      <FleetSection />
      <ServicesSection />
      <TestimonialsSection />

      {/* Local SEO & Rental Guide */}
      <section className="py-12 bg-white rounded-3xl border border-gray-100 shadow-sm p-6 sm:p-10 mb-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="inline-block px-3 py-1 text-xs font-bold text-[#f26e24] bg-orange-50 rounded-full mb-2">
              Affordable 2-Wheeler Rentals
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
              Why Choose Mister Rides for Bike Rental in Hyderabad?
            </h2>
            <p className="text-gray-600 text-sm mt-2">
              Looking for a scooter or bike on rent in Hyderabad? Whether it is daily office commutes in Hitec City or weekend rides, Mister Rides offers verified two-wheelers starting at ₹199/day with zero hidden charges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100">
              <div className="flex items-center gap-2 font-bold text-gray-900 mb-1">
                <IndianRupee className="w-4 h-4 text-[#f26e24]" /> Lowest Price Guarantee
              </div>
              <p className="text-xs text-gray-600">Rent Honda Activa 6G, Dio, and Suzuki Access at just ₹199/day with hourly and monthly options.</p>
            </div>
            <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100">
              <div className="flex items-center gap-2 font-bold text-gray-900 mb-1">
                <Shield className="w-4 h-4 text-[#f26e24]" /> Zero Security Deposit
              </div>
              <p className="text-xs text-gray-600">No heavy advance deposits. Simple digital verification with driving license & Aadhar card.</p>
            </div>
            <div className="p-4 rounded-xl bg-orange-50/50 border border-orange-100">
              <div className="flex items-center gap-2 font-bold text-gray-900 mb-1">
                <MapPin className="w-4 h-4 text-[#f26e24]" /> Metro-Adjacent Hubs
              </div>
              <p className="text-xs text-gray-600">Instant vehicle pickup from Madhapur and Erragadda Metro Station with delivery available.</p>
            </div>
          </div>

          {/* Popular Hubs Internal Links */}
          <div className="mb-12">
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#f26e24]" /> Popular Bike Rental Locations in Hyderabad
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Madhapur', slug: 'madhapur' },
                { name: 'Erragadda', slug: 'erragadda' },
                { name: 'Gachibowli', slug: 'gachibowli' },
                { name: 'Hitec City', slug: 'hitec-city' },
                { name: 'Kondapur', slug: 'kondapur' },
                { name: 'Ameerpet', slug: 'ameerpet' },
                { name: 'SR Nagar', slug: 'sr-nagar' },
                { name: 'Jubilee Hills', slug: 'jubilee-hills' }
              ].map(loc => (
                <Link
                  key={loc.slug}
                  href={`/locations/${loc.slug}`}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-gray-50 border border-gray-200 text-gray-700 hover:border-[#f26e24] hover:text-[#f26e24] hover:bg-orange-50 transition-colors"
                >
                  Bike Rental in {loc.name}
                </Link>
              ))}
            </div>
          </div>

          {/* FAQs */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4 text-center">
              Frequently Asked Questions About Bike Rental
            </h3>
            <BikeRentalFAQ />
          </div>
        </div>
      </section>
    </div>
  );
}
