import Image from 'next/image';
import { Phone } from 'lucide-react';
import { Metadata } from 'next';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';
export const revalidate = 0;

// Add metadata to prevent caching
export const metadata: Metadata = {
  title: 'OnnRides - Maintenance Mode',
  description: 'OnnRides is currently undergoing maintenance. Please check back soon.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function MaintenancePage({ searchParams }: { searchParams: { _t?: string }}) {
  const phoneNumbers = [
    '+91 83090 31203',
    '+91 79934 99752'
  ];
  
  // Use the timestamp for cache busting if available
  const timestamp = searchParams._t || Date.now().toString();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Add a hidden element with the timestamp to ensure dynamic rendering */}
      <div className="hidden" aria-hidden="true" data-timestamp={timestamp} />
      
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <Image
            src={`/logo.png?_t=${timestamp}`}
            alt="OnnRides Logo"
            width={150}
            height={50}
            priority
          />
        </div>

        {/* Maintenance Message */}
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-md space-y-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            We&apos;re Under Maintenance
          </h1>
          
          <p className="text-sm md:text-base text-gray-600">
            We&apos;re currently updating our systems to serve you better. 
            For immediate bookings, please contact us directly:
          </p>

          {/* Contact Numbers */}
          <div className="space-y-4">
            <h2 className="text-base md:text-lg font-semibold text-gray-800">
              Contact for Bookings
            </h2>
            <div className="space-y-4">
              {phoneNumbers.map((number, index) => (
                <a
                  key={index}
                  href={`tel:${number.replace(/\s+/g, '')}`}
                  className="flex items-center justify-center space-x-2 text-[#f26e24] hover:text-[#e05d13] transition-colors py-2"
                  aria-label={`Call ${number}`}
                >
                  <Phone className="h-5 w-5" />
                  <span className="text-base md:text-lg">{number}</span>
                </a>
              ))}
            </div>
          </div>

          {/* WhatsApp Button */}
          <a
            href="https://wa.me/918309031203"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block bg-[#25D366] text-white px-6 py-3 rounded-full hover:bg-[#128C7E] transition-colors mt-6 text-base md:text-lg font-medium w-full md:w-auto"
          >
            Chat on WhatsApp
          </a>
        </div>

        {/* Estimated Time */}
        <p className="text-xs md:text-sm text-gray-500 px-2">
          We apologize for the inconvenience. Our team is working hard to get everything back online.
        </p>
        
        {/* Add another timestamp at the bottom for cache busting */}
        <div className="text-[0.5rem] text-gray-300" aria-hidden="true">
          Last updated: {new Date().toISOString()}
        </div>
      </div>
    </div>
  );
} 