'use client';

import logger from '@/lib/logger';
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

      // Validate inputs with better error messages
      if (!pickupDate) {
        toast.error('Please select a pickup date');
        return;
      }
      if (!pickupTime) {
        toast.error('Please select a pickup time');
        return;
      }
      if (!dropoffDate) {
        toast.error('Please select a drop-off date');
        return;
      }
      if (!dropoffTime) {
        toast.error('Please select a drop-off time');
        return;
      }

      // Parse dates for validation
      const pickupDateTime = new Date(`${pickupDate}T${pickupTime}`);
      const dropoffDateTime = new Date(`${dropoffDate}T${dropoffTime}`);
      const now = new Date();

      logger.debug('Parsed dates:', {
        pickupDateTime: pickupDateTime.toISOString(),
        dropoffDateTime: dropoffDateTime.toISOString(),
        now: now.toISOString()
      });

      if (isNaN(pickupDateTime.getTime())) {
        toast.error('Invalid pickup date/time format');
        return;
      }

      if (isNaN(dropoffDateTime.getTime())) {
        toast.error('Invalid drop-off date/time format');
        return;
      }

      // Set time of now to the start of the current minute for more accurate comparison
      now.setSeconds(0);
      now.setMilliseconds(0);

      if (pickupDateTime < now) {
        toast.error('Pickup time must be in the future');
        return;
      }

      if (dropoffDateTime <= pickupDateTime) {
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

      // Use push instead of replace to maintain history
      router.push(searchUrl);
    } catch (error) {
      logger.error('Search error:', error);
      toast.error('An error occurred while searching. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative h-[50vh] sm:h-screen w-full overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <div className="relative h-[50vh] sm:h-screen w-full sm:hidden flex items-start">
            <Image
              src="/hero-mobile.png"
              alt="Hero Background"
              fill
              className="object-contain object-top"
              priority
              quality={100}
            />
          </div>
          <Image
            src="/hero.png"
            alt="Hero Background"
            fill
            className="hidden sm:block object-cover w-full h-full brightness-[0.85]"
            priority
            quality={100}
          />
        </div>

        {/* Desktop Search Form */}
        <div className="hidden sm:flex absolute inset-0 flex-col items-start justify-center translate-y-[10%] z-10">
          <div className="relative z-10 w-full max-w-7xl mx-auto px-4 md:px-0">
            <div className="w-[350px] md:w-[400px] ml-[5%]">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-4 md:p-6">
                <SearchFormContent
                  pickupDate={pickupDate}
                  setPickupDate={setPickupDate}
                  pickupTime={pickupTime}
                  setPickupTime={setPickupTime}
                  dropoffDate={dropoffDate}
                  setDropoffDate={setDropoffDate}
                  dropoffTime={dropoffTime}
                  setDropoffTime={setDropoffTime}
                  handleSearch={handleSearch}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Form */}
      <div className="sm:hidden w-full px-4 -mt-36">
        <div className="bg-white rounded-xl shadow-lg p-4">
          <SearchFormContent
            pickupDate={pickupDate}
            setPickupDate={setPickupDate}
            pickupTime={pickupTime}
            setPickupTime={setPickupTime}
            dropoffDate={dropoffDate}
            setDropoffDate={setDropoffDate}
            dropoffTime={dropoffTime}
            setDropoffTime={setDropoffTime}
            handleSearch={handleSearch}
            isLoading={isLoading}
          />
        </div>
      </div>
    </>
  );
}

interface SearchFormContentProps {
  pickupDate: string;
  setPickupDate: (date: string) => void;
  pickupTime: string;
  setPickupTime: (time: string) => void;
  dropoffDate: string;
  setDropoffDate: (date: string) => void;
  dropoffTime: string;
  setDropoffTime: (time: string) => void;
  handleSearch: () => void;
  isLoading: boolean;
}

function SearchFormContent({
  pickupDate,
  setPickupDate,
  pickupTime,
  setPickupTime,
  dropoffDate,
  setDropoffDate,
  dropoffTime,
  setDropoffTime,
  handleSearch,
  isLoading
}: SearchFormContentProps) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pickup
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <input
                type="date"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                className="block w-full p-2.5 text-sm border border-gray-300 rounded text-gray-900 bg-white focus:ring-2 focus:ring-[#f26e24] focus:border-transparent"
                style={{ colorScheme: 'light' }}
                required
              />
            </div>
            <div className="relative">
              <select
                value={pickupTime}
                onChange={(e) => setPickupTime(e.target.value)}
                className="block w-full p-2.5 text-sm border border-gray-300 rounded text-gray-900 bg-white focus:ring-2 focus:ring-[#f26e24] focus:border-transparent"
                style={{ colorScheme: 'light' }}
                required
              >
                <option value="">Select time</option>
                {[...Array(24)].map((_, i) => {
                  const hour = i;
                  const period = hour >= 12 ? 'PM' : 'AM';
                  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                  const timeStr = `${hour.toString().padStart(2, '0')}:00`;
                  return (
                    <option key={timeStr} value={timeStr}>
                      {`${hour12}:00 ${period}`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Dropoff
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <input
                type="date"
                min={pickupDate || new Date().toISOString().split('T')[0]}
                value={dropoffDate}
                onChange={(e) => {
                  logger.debug('Dropoff date changed:', e.target.value);
                  setDropoffDate(e.target.value);
                }}
                className="w-full p-2.5 text-sm border border-gray-300 rounded text-gray-900 bg-white focus:ring-2 focus:ring-[#f26e24] focus:border-transparent appearance-none"
                required
              />
            </div>
            <div>
              <select
                value={dropoffTime}
                onChange={(e) => setDropoffTime(e.target.value)}
                className="w-full p-2.5 text-sm border border-gray-300 rounded text-gray-900 bg-white focus:ring-2 focus:ring-[#f26e24] focus:border-transparent touch-manipulation"
                required
              >
                <option value="">Select time</option>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  const period = i >= 12 ? 'PM' : 'AM';
                  const hour12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
                  return (
                    <option key={hour} value={`${hour}:00`}>
                      {`${hour12}:00 ${period}`}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSearch}
        disabled={isLoading}
        className={`w-full mt-4 bg-[#f26e24] text-white py-3 rounded text-sm font-medium ${
          isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#e05e1c] active:bg-[#d05510]'
        }`}
      >
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </>
  );
} 