'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [dropoffTime, setDropoffTime] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
      alert('Please fill in all fields');
      return;
    }

    const searchParams = new URLSearchParams({
      pickupDate,
      pickupTime,
      dropoffDate,
      dropoffTime
    });

    router.push(`/vehicles?${searchParams.toString()}`);
  };

  // Helper function to convert 24h to 12h format
  const formatTime = (hour: number): string => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${hour12}:00 ${period}`;
  };

  // Generate time options for 24 hours
  const timeOptions = Array.from({ length: 24 }, (_, i) => ({
    value: `${i.toString().padStart(2, '0')}:00`,
    label: formatTime(i)
  }));

  return (
    <div className="min-h-screen bg-[#fff8f0]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="text-center">
                <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
                  <span className="block">MAKE IT A DECEMBER TO</span>
                  <span className="block">REMEMBER</span>
                </h1>
                <p className="mt-3 text-base text-gray-500 sm:mt-5 sm:text-lg sm:max-w-xl sm:mx-auto md:mt-5 md:text-xl">
                  Let's find your perfect ride
                </p>

                {/* Search Form */}
                <div className="mt-10 max-w-xl mx-auto bg-white rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    Search your next ride
                  </h2>
                  <form onSubmit={handleSearch} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Pickup
                        </label>
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={pickupDate}
                            onChange={(e) => setPickupDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="shadow-sm focus:ring-[#f26e24] focus:border-[#f26e24] block w-full sm:text-sm border-gray-300 rounded-md"
                            required
                          />
                          <select
                            value={pickupTime}
                            onChange={(e) => setPickupTime(e.target.value)}
                            className="shadow-sm focus:ring-[#f26e24] focus:border-[#f26e24] block w-full sm:text-sm border-gray-300 rounded-md"
                            required
                          >
                            <option value="">Select time</option>
                            {timeOptions.map(({ value, label }) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Dropoff
                        </label>
                        <div className="mt-1 grid grid-cols-2 gap-2">
                          <input
                            type="date"
                            value={dropoffDate}
                            onChange={(e) => setDropoffDate(e.target.value)}
                            min={pickupDate || new Date().toISOString().split('T')[0]}
                            className="shadow-sm focus:ring-[#f26e24] focus:border-[#f26e24] block w-full sm:text-sm border-gray-300 rounded-md"
                            required
                          />
                          <select
                            value={dropoffTime}
                            onChange={(e) => setDropoffTime(e.target.value)}
                            className="shadow-sm focus:ring-[#f26e24] focus:border-[#f26e24] block w-full sm:text-sm border-gray-300 rounded-md"
                            required
                          >
                            <option value="">Select time</option>
                            {timeOptions.map(({ value, label }) => (
                              <option key={value} value={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#f26e24] hover:bg-[#e05d13] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#f26e24]"
                    >
                      Search
                    </button>
                  </form>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Services We Offer
            </h2>
            <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-[#f26e24] text-white mx-auto">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="mt-3 text-lg font-medium text-gray-900">24/7 Support</h3>
                <p className="mt-2 text-base text-gray-500">
                  Round the clock customer support for all your needs
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-[#f26e24] text-white mx-auto">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
                <h3 className="mt-3 text-lg font-medium text-gray-900">Best Prices</h3>
                <p className="mt-2 text-base text-gray-500">
                  Competitive rates and transparent pricing
                </p>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-[#f26e24] text-white mx-auto">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="mt-3 text-lg font-medium text-gray-900">Quality Vehicles</h3>
                <p className="mt-2 text-base text-gray-500">
                  Well-maintained and regularly serviced vehicles
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 