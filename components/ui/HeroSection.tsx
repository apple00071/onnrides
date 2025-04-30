'use client';

import logger from '@/lib/logger';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-hot-toast';
import { FaCalendar, FaClock } from 'react-icons/fa';
import DatePicker from 'react-datepicker';
import '@/styles/datepicker.css';
import { cn } from "@/lib/utils";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function HeroSection() {
  const router = useRouter();
  const [pickupDate, setPickupDate] = useState<Date | null>(null);
  const [pickupTime, setPickupTime] = useState<string>('');
  const [dropoffDate, setDropoffDate] = useState<Date | null>(null);
  const [dropoffTime, setDropoffTime] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeliveryPartner, setIsDeliveryPartner] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState<'7' | '15' | '30'>('7');

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

      // Get current time in IST
      const now = new Date();
      const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      istNow.setSeconds(0);
      istNow.setMilliseconds(0);

      // Create pickup datetime in IST
      const [pickupHours, pickupMinutes] = pickupTime.split(':').map(Number);
      const pickupDateIST = new Date(pickupDate);
      pickupDateIST.setHours(pickupHours, pickupMinutes, 0, 0);
      const pickupDateTime = new Date(pickupDateIST.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

      // Create dropoff datetime in IST
      const [dropoffHours, dropoffMinutes] = dropoffTime.split(':').map(Number);
      const dropoffDateIST = new Date(dropoffDate);
      dropoffDateIST.setHours(dropoffHours, dropoffMinutes, 0, 0);
      const dropoffDateTime = new Date(dropoffDateIST.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

      // Debug log times with proper formatting
      logger.debug('Time comparison:', {
        currentLocal: now.toLocaleString(),
        currentIST: istNow.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        pickupLocal: pickupDateIST.toLocaleString(),
        pickupIST: pickupDateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        dropoffLocal: dropoffDateIST.toLocaleString(),
        dropoffIST: dropoffDateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
        timestamps: {
          current: istNow.getTime(),
          pickup: pickupDateTime.getTime(),
          dropoff: dropoffDateTime.getTime()
        }
      });

      // Convert all dates to UTC for comparison
      const currentUTC = istNow.getTime();
      const pickupUTC = pickupDateTime.getTime();
      const dropoffUTC = dropoffDateTime.getTime();

      // Compare times using UTC timestamps
      if (pickupUTC <= currentUTC) {
        logger.warn('Pickup date is in the past:', {
          currentTime: istNow.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          pickupTime: pickupDateTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
        });
        toast.error('Pickup time must be in the future');
        return;
      }

      if (dropoffUTC <= pickupUTC) {
        toast.error('Drop-off time must be after pickup time');
        return;
      }

      setIsLoading(true);

      try {
        // Format dates for URL in IST format
        const formatDateForUrl = (date: Date) => {
          const d = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        };

        // Create URL parameters
        const params = new URLSearchParams({
          pickupDate: formatDateForUrl(pickupDateTime),
          pickupTime: pickupTime,
          dropoffDate: formatDateForUrl(dropoffDateTime),
          dropoffTime: dropoffTime,
          type: 'bike'
        });

        // Add duration parameter for delivery partner mode
        if (isDeliveryPartner) {
          params.append('duration', selectedDuration);
        }

        // Construct the full URL based on mode
        const searchUrl = isDeliveryPartner 
          ? `/delivery-partners?${params.toString()}`
          : `/vehicles?${params.toString()}`;
        
        // Debug log the URL
        logger.debug('Navigation URL:', {
          url: searchUrl,
          params: {
            pickupDate: formatDateForUrl(pickupDateTime),
            pickupTime,
            dropoffDate: formatDateForUrl(dropoffDateTime),
            dropoffTime,
            type: 'bike'
          }
        });

        // Use router.push with catch block
        await router.push(searchUrl);
      } catch (navigationError) {
        logger.error('Navigation error:', navigationError);
        toast.error('Failed to navigate to search results page. Please try again.');
      }
    } catch (error) {
      logger.error('Search error:', error);
      toast.error('An error occurred while searching. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // When duration changes or delivery partner mode changes, update dropoff date
  useEffect(() => {
    if (isDeliveryPartner && pickupDate) {
      const newDropoffDate = new Date(pickupDate);
      newDropoffDate.setDate(newDropoffDate.getDate() + parseInt(selectedDuration));
      setDropoffDate(newDropoffDate);
      // Set dropoff time same as pickup time
      setDropoffTime(pickupTime || '');
    }
  }, [selectedDuration, pickupDate, pickupTime, isDeliveryPartner]);

  // When switching modes, reset dropoff date/time if switching to delivery partner mode
  useEffect(() => {
    if (isDeliveryPartner && pickupDate) {
      const newDropoffDate = new Date(pickupDate);
      newDropoffDate.setDate(newDropoffDate.getDate() + parseInt(selectedDuration));
      setDropoffDate(newDropoffDate);
      setDropoffTime(pickupTime || '');
    }
  }, [isDeliveryPartner]);

  return (
    <>
      <div className="relative h-[50vh] sm:h-screen w-full">
        {/* Background Image */}
        <div className="absolute inset-0">
          <div className="relative h-[50vh] sm:h-screen w-full sm:hidden">
            <Image
              src="/hero-mobile.png"
              alt="Hero Background"
              fill
              className="object-cover"
              priority
              quality={100}
            />
          </div>
          <div className="hidden sm:block h-full">
            <Image
              src="/hero.png"
              alt="Hero Background"
              fill
              className="object-cover w-full h-full brightness-[0.85]"
              priority
              quality={100}
            />
          </div>
        </div>

        {/* Desktop Search Form */}
        <div className="hidden sm:flex absolute inset-0 items-center justify-start z-10">
          <div className="w-full max-w-7xl mx-auto px-4 md:px-6">
            <div className="w-[350px] md:w-[400px]">
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
                  isDeliveryPartner={isDeliveryPartner}
                  setIsDeliveryPartner={setIsDeliveryPartner}
                  selectedDuration={selectedDuration}
                  setSelectedDuration={setSelectedDuration}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Search Form */}
        <div className="sm:hidden absolute bottom-0 left-0 right-0 p-4 bg-transparent">
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
              isDeliveryPartner={isDeliveryPartner}
              setIsDeliveryPartner={setIsDeliveryPartner}
              selectedDuration={selectedDuration}
              setSelectedDuration={setSelectedDuration}
            />
          </div>
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
  isDeliveryPartner: boolean;
  setIsDeliveryPartner: (value: boolean) => void;
  selectedDuration: '7' | '15' | '30';
  setSelectedDuration: (duration: '7' | '15' | '30') => void;
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
  isLoading,
  isDeliveryPartner,
  setIsDeliveryPartner,
  selectedDuration,
  setSelectedDuration
}: SearchFormContentProps) {
  const minDate = new Date();
  minDate.setHours(0, 0, 0, 0);

  // Generate time options in IST
  const getTimeOptions = (isPickup: boolean) => {
    // Get current time in IST using proper timezone conversion
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    // Debug log current time
    logger.debug('Time Options Debug:', {
      localTime: now.toLocaleString(),
      istTime: istTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      currentHour: istTime.getHours(),
      currentMinutes: istTime.getMinutes()
    });

    interface TimeOption {
      value: string;
      label: string;
    }
    
    const options: TimeOption[] = [];
    const selectedDate = isPickup ? pickupDate : dropoffDate;
    
    if (!selectedDate) return options;

    // Convert selected date to IST for comparison
    const selectedDateIST = new Date(selectedDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const todayIST = new Date(istTime.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    
    // Reset hours to compare just the dates
    todayIST.setHours(0, 0, 0, 0);
    const compareDate = new Date(selectedDateIST);
    compareDate.setHours(0, 0, 0, 0);

    // Check if the selected date is today
    const isToday = compareDate.getTime() === todayIST.getTime();

    // For today, start from current hour + 2 hours (or 3 if past half hour)
    let startHour = 0;
    if (isToday) {
      const currentHour = istTime.getHours();
      const currentMinutes = istTime.getMinutes();
      
      // If we're past half hour, start from next hour + 2
      startHour = currentMinutes >= 30 ? currentHour + 3 : currentHour + 2;
      
      // If we're too late in the day, return no options
      if (startHour >= 24) {
        return options;
      }
    }

    // Generate time slots
    for (let i = startHour; i < 24; i++) {
      // For dropoff, skip times before or equal to pickup time on the same day
      if (!isPickup && 
          selectedDateIST.toDateString() === pickupDate?.toDateString() && 
          pickupTime) {
        const [pickupHour] = pickupTime.split(':').map(Number);
        if (i <= pickupHour) continue;
      }

      const hour12 = i === 0 ? 12 : i > 12 ? i - 12 : i;
      const period = i >= 12 ? 'PM' : 'AM';
      const timeValue = `${i.toString().padStart(2, '0')}:00`;
      const label = `${hour12}:00 ${period}`;
      
      options.push({ value: timeValue, label });
    }

    return options;
  };

  const handlePickupDateChange = (date: Date | null) => {
    if (date) {
      // Convert the selected date to IST
      const istOffset = 5.5 * 60 * 60 * 1000;
      const dateInIST = new Date(date.getTime());
      setPickupDate(dateInIST);
      
      // Reset dropoff if it's before the new pickup date
      if (dropoffDate && dropoffDate < dateInIST) {
        setDropoffDate(null);
        setDropoffTime('');
      }
    } else {
      setPickupDate(null);
    }
  };

  const handleDropoffDateChange = (date: Date | null) => {
    if (date) {
      // Convert the selected date to IST
      const istOffset = 5.5 * 60 * 60 * 1000;
      const dateInIST = new Date(date.getTime());
      setDropoffDate(dateInIST);
    } else {
      setDropoffDate(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label htmlFor="delivery-partner" className="text-sm font-medium text-gray-700">
          Delivery Partner Mode
        </Label>
        <Switch
          id="delivery-partner"
          checked={isDeliveryPartner}
          onCheckedChange={setIsDeliveryPartner}
          className="data-[state=checked]:bg-[#f26e24]"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {isDeliveryPartner ? 'Start Date' : 'Pickup Date'}
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
              showPopperArrow={false}
              popperClassName="date-picker-popper"
              calendarClassName="shadow-lg border border-gray-200 rounded-lg"
              onChangeRaw={(event) => {
                if (event) event.preventDefault();
              }}
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

      {isDeliveryPartner ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Rental Duration
          </label>
          <select
            value={selectedDuration}
            onChange={(e) => setSelectedDuration(e.target.value as '7' | '15' | '30')}
            className="block w-full p-2.5 text-sm border border-gray-300 rounded-xl text-gray-500 bg-white focus:ring-1 focus:ring-[#f26e24] focus:border-[#f26e24] appearance-none cursor-pointer outline-none transition-colors"
          >
            <option value="7">7 Days</option>
            <option value="15">15 Days</option>
            <option value="30">30 Days</option>
          </select>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Return Date
          </label>
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <DatePicker
                selected={dropoffDate}
                onChange={handleDropoffDateChange}
                dateFormat="dd/MM/yyyy"
                minDate={minDate}
                placeholderText="Select date"
                className="block w-full p-2.5 text-sm border border-gray-300 rounded-xl text-gray-500 bg-white focus:ring-1 focus:ring-[#f26e24] focus:border-[#f26e24] cursor-pointer outline-none transition-colors"
                showPopperArrow={false}
                popperClassName="date-picker-popper"
                calendarClassName="shadow-lg border border-gray-200 rounded-lg"
                onChangeRaw={(event) => {
                  if (event) event.preventDefault();
                }}
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
      )}

      <button
        onClick={handleSearch}
        disabled={isLoading}
        className="w-full mt-4 bg-[#f26e24] text-white py-3 rounded-full text-base font-medium hover:bg-[#e05d13] transition-colors disabled:opacity-50 disabled:cursor-not-allowed search-button"
        style={{ color: 'white !important' }}
      >
        {isLoading ? 'Searching...' : isDeliveryPartner ? 'Find Available Bikes' : 'Search Bikes'}
      </button>
    </div>
  );
} 