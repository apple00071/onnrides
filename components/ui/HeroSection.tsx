'use client';

import logger from '@/lib/logger';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { FaCalendar, FaClock } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";

// Add custom styles for the date picker
const datePickerStyles = `
  .react-datepicker {
    font-family: inherit;
    border-radius: 0.75rem;
    border: 1px solid #e5e7eb;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  }
  .react-datepicker__header {
    background-color: white;
    border-top-left-radius: 0.75rem;
    border-top-right-radius: 0.75rem;
    border-bottom: 1px solid #e5e7eb;
    padding-top: 0.5rem;
  }
  .react-datepicker__current-month {
    color: #374151;
    font-weight: 600;
    font-size: 1rem;
  }
  .react-datepicker__day-name {
    color: #6B7280;
    font-weight: 500;
  }
  .react-datepicker__day--selected,
  .react-datepicker__day--keyboard-selected {
    background-color: #f26e24 !important;
    color: white !important;
  }
  .react-datepicker__day:hover {
    background-color: #ffeee6 !important;
  }
  .react-datepicker__navigation-icon::before {
    border-color: #6B7280;
  }
  .react-datepicker__navigation:hover *::before {
    border-color: #f26e24;
  }
  .react-datepicker__input-container {
    position: relative;
  }
  .react-datepicker__input-container::after {
    content: '';
    position: absolute;
    right: 0.5rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.2em;
    height: 1.2em;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-size: contain;
    background-repeat: no-repeat;
    pointer-events: none;
    opacity: 0.75;
  }
  .react-datepicker__input-container input {
    padding-right: 2.5rem;
    font-size: 0.875rem;
    color: #6B7280;
    border-radius: 0.75rem;
  }

  /* Add styles for the time select dropdown */
  select {
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%236B7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    background-size: 1.2em;
    padding-right: 2.5rem;
    opacity: 0.75;
  }

  select::-ms-expand {
    display: none;
  }

  select option:checked {
    background-color: #f26e24;
    color: white;
  }

  select option:hover {
    background-color: #ffeee6;
  }
`;

export default function HeroSection() {
  const router = useRouter();
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [pickupTime, setPickupTime] = useState<string>('');
  const [dropoffDate, setDropoffDate] = useState<Date | null>(null);
  const [dropoffTime, setDropoffTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    try {
      // Validate inputs with better error messages
      if (!pickupDate) {
        toast.error('Please select pickup date');
        return;
      }
      if (!pickupTime) {
        toast.error('Please select pickup time');
        return;
      }
      if (!dropoffDate) {
        toast.error('Please select drop-off date');
        return;
      }
      if (!dropoffTime) {
        toast.error('Please select drop-off time');
        return;
      }

      const now = new Date();
      now.setSeconds(0);
      now.setMilliseconds(0);

      const pickupDateTime = new Date(pickupDate);
      const [pickupHours, pickupMinutes] = pickupTime.split(':').map(Number);
      pickupDateTime.setHours(pickupHours, pickupMinutes, 0, 0);

      const dropoffDateTime = new Date(dropoffDate);
      const [dropoffHours, dropoffMinutes] = dropoffTime.split(':').map(Number);
      dropoffDateTime.setHours(dropoffHours, dropoffMinutes, 0, 0);

      if (pickupDateTime < now) {
        toast.error('Pickup time must be in the future');
        return;
      }

      if (dropoffDateTime <= pickupDateTime) {
        toast.error('Drop-off time must be after pickup time');
        return;
      }

      setIsLoading(true);

      // Format dates for URL
      const formatDateForUrl = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        return dateStr;
      };

      // Create the search URL with all required parameters
      const searchParams = new URLSearchParams();
      searchParams.append('pickupDate', formatDateForUrl(pickupDate));
      searchParams.append('pickupTime', pickupTime);
      searchParams.append('dropoffDate', formatDateForUrl(dropoffDate));
      searchParams.append('dropoffTime', dropoffTime);
      searchParams.append('type', 'bike');

      const searchUrl = `/vehicles?${searchParams.toString()}`;
      logger.debug('Navigation URL:', searchUrl);

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
      <style>{datePickerStyles}</style>
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
  pickupDate: Date | null;
  setPickupDate: (date: Date | null) => void;
  pickupTime: string;
  setPickupTime: (time: string) => void;
  dropoffDate: Date | null;
  setDropoffDate: (date: Date | null) => void;
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
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

  const handlePickupDateChange = (date: Date | null) => {
    setPickupDate(date);
    if (date && dropoffDate && dropoffDate < date) {
      setDropoffDate(date);
      toast.success('Drop-off date adjusted to match pickup date');
    }
  };

  const handleDropoffDateChange = (date: Date | null) => {
    if (date && pickupDate && date < pickupDate) {
      toast.error('Drop-off date cannot be before pickup date');
      return;
    }
    setDropoffDate(date);
  };

  const getTimeOptions = (isPickup: boolean) => {
    const options = [];
    const now = new Date();
    const selectedDate = isPickup ? pickupDate : dropoffDate;
    const isToday = selectedDate?.toDateString() === now.toDateString();
    const currentHour = now.getHours();

    for (let hour = 0; hour < 24; hour++) {
      // Skip past times for today
      if (isToday && hour < currentHour) {
        continue;
      }

      // For dropoff, skip times before pickup time on the same day
      if (!isPickup && selectedDate?.toDateString() === pickupDate?.toDateString() && pickupTime) {
        const [pickupHour] = pickupTime.split(':').map(Number);
        if (hour <= pickupHour) {
          continue;
        }
      }

      const timeValue = `${hour.toString().padStart(2, '0')}:00`;
      const period = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const label = `${hour12}:00 ${period}`;
      
      options.push({ value: timeValue, label });
    }
    return options;
  };

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">
        Find your perfect ride
      </h2>
      
      {/* Pickup Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pickup
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <DatePicker
              selected={pickupDate}
              onChange={handlePickupDateChange}
              dateFormat="dd/MM/yyyy"
              minDate={minDate}
              placeholderText="Select date"
              className="block w-full p-2.5 text-sm border border-gray-300 rounded-xl text-gray-500 bg-white focus:ring-1 focus:ring-[#f26e24] focus:border-[#f26e24] cursor-pointer outline-none transition-colors"
            />
          </div>
          <div className="relative">
            <select
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="block w-full p-2.5 text-sm border border-gray-300 rounded-xl text-gray-500 bg-white focus:ring-1 focus:ring-[#f26e24] focus:border-[#f26e24] appearance-none cursor-pointer outline-none transition-colors"
            >
              <option value="">Select time</option>
              {getTimeOptions(true).map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dropoff Section */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Dropoff
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div className="relative">
            <DatePicker
              selected={dropoffDate}
              onChange={handleDropoffDateChange}
              dateFormat="dd/MM/yyyy"
              minDate={pickupDate || minDate}
              placeholderText="Select date"
              className="block w-full p-2.5 text-sm border border-gray-300 rounded-xl text-gray-500 bg-white focus:ring-1 focus:ring-[#f26e24] focus:border-[#f26e24] cursor-pointer outline-none transition-colors"
            />
          </div>
          <div className="relative">
            <select
              value={dropoffTime}
              onChange={(e) => setDropoffTime(e.target.value)}
              className="block w-full p-2.5 text-sm border border-gray-300 rounded-xl text-gray-500 bg-white focus:ring-1 focus:ring-[#f26e24] focus:border-[#f26e24] appearance-none cursor-pointer outline-none transition-colors"
            >
              <option value="">Select time</option>
              {getTimeOptions(false).map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Search Button */}
      <button
        onClick={handleSearch}
        disabled={isLoading}
        className="w-full mt-4 bg-[#f26e24] text-white py-3 rounded-lg text-base font-medium hover:bg-[#e05d13] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </div>
  );
} 