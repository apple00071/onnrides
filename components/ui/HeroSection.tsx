'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export default function HeroSection() {
  const router = useRouter();
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [dropoffTime, setDropoffTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState<'pickup' | 'dropoff' | null>(null);

  // Generate time options with 30-minute intervals
  const generateTimeOptions = () => {
    const options: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute of ['00', '30']) {
        const time = `${hour.toString().padStart(2, '0')}:${minute}`;
        options.push(time);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  // Function to check if a datetime is in the past
  const isInPast = (date: string, time: string) => {
    const selectedDateTime = new Date(`${date}T${time}`);
    const now = new Date();
    return selectedDateTime < now;
  };

  const handlePickupTimeChange = (time: string) => {
    if (pickupDate && isInPast(pickupDate, time)) {
      toast.error('Cannot select a past time');
      return;
    }
    setPickupTime(time);
    setShowTimePicker(null);
  };

  const handleDropoffTimeChange = (time: string) => {
    setDropoffTime(time);
    setShowTimePicker(null);
  };

  const handleSearch = () => {
    if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
      toast.error('Please select all date and time fields');
      return;
    }

    const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
    const dropoffDateTime = new Date(`${dropoffDate}T${dropoffTime}`);
    const now = new Date();

    if (pickupDateTime < now) {
      toast.error('Cannot select a past date and time for pickup');
      return;
    }

    if (dropoffDateTime <= pickupDateTime) {
      toast.error('Drop-off time must be after pickup time');
      return;
    }

    // Create the search URL with all required parameters
    const searchParams = new URLSearchParams({
      pickupDate,
      pickupTime,
      dropoffDate,
      dropoffTime
    });

    router.push(`/vehicles?${searchParams.toString()}`);
  };

  return (
    <div className="relative min-h-[80vh] bg-[#FFF8F0] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl md:text-6xl font-bold mb-4">
        MAKE IT A DECEMBER TO<br />REMEMBER
      </h1>
      <p className="text-gray-600 mb-8">
        Let&apos;s find your perfect ride
      </p>

      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Search your next ride</h2>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  min={today}
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="p-2 border rounded-lg w-full text-gray-900 bg-white focus:ring-2 focus:ring-[#f26e24] focus:border-transparent"
                  placeholder="Select date"
                  required
                />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTimePicker('pickup')}
                    className="p-2 border rounded-lg w-full text-left text-gray-900 bg-white flex justify-between items-center hover:border-[#f26e24] focus:ring-2 focus:ring-[#f26e24] focus:border-transparent"
                  >
                    {pickupTime || 'Select time'}
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  </button>
                  {showTimePicker === 'pickup' && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                      {timeOptions.map((time) => (
                        <button
                          key={time}
                          onClick={() => handlePickupTimeChange(time)}
                          className="w-full px-4 py-2 text-left text-gray-900 hover:bg-gray-100"
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dropoff
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="date"
                  min={pickupDate || today}
                  value={dropoffDate}
                  onChange={(e) => setDropoffDate(e.target.value)}
                  className="p-2 border rounded-lg w-full text-gray-900 bg-white focus:ring-2 focus:ring-[#f26e24] focus:border-transparent"
                  placeholder="Select date"
                  required
                />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTimePicker('dropoff')}
                    className="p-2 border rounded-lg w-full text-left text-gray-900 bg-white flex justify-between items-center hover:border-[#f26e24] focus:ring-2 focus:ring-[#f26e24] focus:border-transparent"
                  >
                    {dropoffTime || 'Select time'}
                    <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                  </button>
                  {showTimePicker === 'dropoff' && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-50">
                      {timeOptions.map((time) => (
                        <button
                          key={time}
                          onClick={() => handleDropoffTimeChange(time)}
                          className="w-full px-4 py-2 text-left text-gray-900 hover:bg-gray-100"
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="w-full bg-[#f26e24] text-white py-3 rounded-lg hover:bg-[#e05e1c] transition-colors"
          >
            Search
          </button>
        </div>
      </div>

      {/* Overlay to close time picker when clicking outside */}
      {showTimePicker && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setShowTimePicker(null)}
        />
      )}
    </div>
  );
} 