import Image from 'next/image';
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

        {/* Maintenance Message - Simplified as requested */}
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-md space-y-6">
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">
            We&apos;re Under Maintenance
          </h1>
          
          <p className="text-sm md:text-base text-gray-600">
            We&apos;re currently updating our systems to serve you better.
          </p>
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