'use client';

import { logger } from '@/lib/logger';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { FaCalendar, FaClock } from 'react-icons/fa';
import { TimePicker } from './time-picker';

export default function HeroSection() {
  const router = useRouter();
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [dropoffDate, setDropoffDate] = useState('');
  const [dropoffTime, setDropoffTime] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    try {
      // Log initial state
      logger.debug('Current state:', {
        pickupDate,
        pickupTime,
        dropoffDate,
        dropoffTime
      });

      // Validate inputs
      if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
        logger.debug('Missing required fields');
        toast.error('Please select all date and time fields');
        return;
      }

      // Parse dates for validation
      const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
      const dropoffDateTime = new Date(`${dropoffDate}T${dropoffTime}`);
      const now = new Date();

      logger.debug('Parsed dates:', {
        pickupDateTime,
        dropoffDateTime,
        now
      });

      if (isNaN(pickupDateTime.getTime()) || isNaN(dropoffDateTime.getTime())) {
        logger.error('Invalid date format');
        toast.error('Invalid date format');
        return;
      }

      if (pickupDateTime < now) {
        logger.debug('Past date selected');
        toast.error('Cannot select a past date and time for pickup');
        return;
      }

      if (dropoffDateTime <= pickupDateTime) {
        logger.debug('Invalid time range');
        toast.error('Drop-off time must be after pickup time');
        return;
      }

      setIsLoading(true);

      // Create the search URL with all required parameters
      const searchParams = new URLSearchParams();
      searchParams.append('pickupDate', pickupDate);
      searchParams.append('pickupTime', pickupTime);
      searchParams.append('dropoffDate', dropoffDate);
      searchParams.append('dropoffTime', dropoffTime);
      searchParams.append('type', 'car');

      const searchUrl = `/vehicles?${searchParams.toString()}`;
      logger.debug('Navigation URL:', searchUrl);

      // Navigate to vehicles page with replace to allow going back
      router.replace(searchUrl);
    } catch (error) {
      logger.error('Search error:', error);
      toast.error('An error occurred while searching. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-[80vh] bg-[#FFF8F0] flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-4xl md:text-6xl font-bold mb-4">
        MAKE IT A DECEMBER TO<br />REMEMBER
      </h1>
      <div className="w-full max-w-3xl mt-8">
        <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pickup
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    value={pickupDate}
                    onChange={(e) => {
                      logger.debug('Pickup date changed:', e.target.value);
                      setPickupDate(e.target.value);
                    }}
                    className="w-full p-2 border rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[#f26e24] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <TimePicker
                    value={pickupTime}
                    onChange={(time) => {
                      logger.debug('Pickup time changed:', time);
                      setPickupTime(time);
                    }}
                    minTime={pickupDate === new Date().toISOString().split('T')[0] ? 
                      new Date().getHours().toString().padStart(2, '0') + ':00' : 
                      undefined}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dropoff
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input
                    type="date"
                    min={pickupDate || new Date().toISOString().split('T')[0]}
                    value={dropoffDate}
                    onChange={(e) => {
                      logger.debug('Dropoff date changed:', e.target.value);
                      setDropoffDate(e.target.value);
                    }}
                    className="w-full p-2 border rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-[#f26e24] focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <TimePicker
                    value={dropoffTime}
                    onChange={(time) => {
                      logger.debug('Dropoff time changed:', time);
                      setDropoffTime(time);
                    }}
                    minTime={dropoffDate === pickupDate ? pickupTime : undefined}
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={isLoading}
            className={`w-full mt-6 bg-[#f26e24] text-white py-3 rounded-lg transition-colors ${
              isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e05e1c]'
            }`}
          >
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </div>
    </div>
  );
} 