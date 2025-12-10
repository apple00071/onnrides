'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatDateTimeIST, toIST } from '@/lib/utils/timezone';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { VehicleCard } from "@/components/VehicleCard";
import { FaFilter, FaSort } from 'react-icons/fa';
import { redirect } from 'next/navigation';
import logger from '@/lib/logger';
import { Vehicle } from './types';
import { calculateRentalPrice } from '@/lib/utils/price';

export default function VehiclesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('price-low-high');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [searchDuration, setSearchDuration] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string | undefined>(undefined);
  const isInitialMount = useRef(true);
  const processingLocationChange = useRef(false);
  const lastLocationUpdateRef = useRef<string | undefined>(undefined);
  const lastLocationUpdateTimeRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [urlParams, setUrlParams] = useState<{
    pickupDate: string;
    pickupTime: string;
    dropoffDate: string;
    dropoffTime: string;
    location: string | null;
  }>({
    pickupDate: '',
    pickupTime: '',
    dropoffDate: '',
    dropoffTime: '',
    location: null
  });

  // Format date for display using centralized timezone utility
  const formatDateForDisplay = (date: Date | string) => {
    try {
      return formatDateTimeIST(date);
    } catch (error) {
      logger.error('Error formatting date for display', { date, error });
      return String(date);
    }
  };

  // Convert date to IST for comparison
  const convertToIST = (date: Date | string) => {
    try {
      return toIST(date);
    } catch (error) {
      logger.error('Error converting date to IST', { date, error });
      return new Date(date);
    }
  };

  const pickupDate = searchParams?.get('pickupDate');
  const dropoffDate = searchParams?.get('dropoffDate');
  const pickupTime = searchParams?.get('pickupTime');
  const dropoffTime = searchParams?.get('dropoffTime');

  // Validate dates
  if (!pickupDate || !dropoffDate || !pickupTime || !dropoffTime) {
    return redirect('/');
  }

  const parsedPickupDate = convertToIST(pickupDate);
  const parsedDropoffDate = convertToIST(dropoffDate);

  if (!parsedPickupDate || !parsedDropoffDate) {
    return redirect('/');
  }

  // Set hours and minutes for pickup and dropoff dates
  const [pickupHours, pickupMinutes] = pickupTime.split(':').map(Number);
  const [dropoffHours, dropoffMinutes] = dropoffTime.split(':').map(Number);

  parsedPickupDate.setHours(pickupHours, pickupMinutes, 0, 0);
  parsedDropoffDate.setHours(dropoffHours, dropoffMinutes, 0, 0);

  // Get current time in IST
  const now = new Date();
  const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  // Create pickup datetime in IST
  const pickupDateIST = new Date(parsedPickupDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  pickupDateIST.setHours(pickupHours, pickupMinutes, 0, 0);
  const pickupDateTime = new Date(pickupDateIST.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

  // Create dropoff datetime in IST
  const dropoffDateIST = new Date(parsedDropoffDate.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
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
    return redirect('/');
  }

  if (dropoffUTC <= pickupUTC) {
    logger.warn('Dropoff date is before or equal to pickup date');
    return redirect('/');
  }

  // Format dates for display in IST
  const displayPickupDate = formatDateForDisplay(parsedPickupDate);
  const displayDropoffDate = formatDateForDisplay(parsedDropoffDate);

  // Add duration calculation function
  const calculateDuration = () => {
    if (!urlParams.pickupDate || !urlParams.pickupTime || !urlParams.dropoffDate || !urlParams.dropoffTime) {
      return 'Select pickup and dropoff times';
    }

    const pickup = new Date(`${urlParams.pickupDate}T${urlParams.pickupTime}`);
    const dropoff = new Date(`${urlParams.dropoffDate}T${urlParams.dropoffTime}`);

    if (isNaN(pickup.getTime()) || isNaN(dropoff.getTime())) {
      return 'Invalid date/time';
    }

    const diffInHours = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 0) {
      return 'Invalid duration';
    }

    if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours === 1 ? '' : 's'}`;
    }

    const days = Math.floor(diffInHours / 24);
    const remainingHours = diffInHours % 24;

    if (remainingHours === 0) {
      return `${days} day${days === 1 ? '' : 's'}`;
    }

    return `${days} day${days === 1 ? '' : 's'} ${remainingHours} hour${remainingHours === 1 ? '' : 's'}`;
  };

  const getDurationPrice = (vehicle: Vehicle) => {
    if (!vehicle) return 0;

    // Calculate total hours for the selected duration
    const pickup = new Date(`${urlParams.pickupDate}T${urlParams.pickupTime}`);
    const dropoff = new Date(`${urlParams.dropoffDate}T${urlParams.dropoffTime}`);
    const diffMs = dropoff.getTime() - pickup.getTime();
    const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));

    // Check if weekend
    const isWeekend = pickup.getDay() === 0 || pickup.getDay() === 6;

    // Use the correct pricing calculation
    return calculateRentalPrice({
      price_per_hour: vehicle.price_per_hour,
      price_7_days: vehicle.price_7_days,
      price_15_days: vehicle.price_15_days,
      price_30_days: vehicle.price_30_days
    }, totalHours, isWeekend);
  };

  const handleLocationSelect = useCallback((location: string) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    const now = Date.now();
    const timeSinceLastUpdate = now - lastLocationUpdateTimeRef.current;

    // Skip if already processing or if update is too soon
    if (processingLocationChange.current || timeSinceLastUpdate < 1000) {
      return;
    }

    // Skip if the location hasn't actually changed
    if (location === lastLocationUpdateRef.current) {
      return;
    }

    processingLocationChange.current = true;
    lastLocationUpdateTimeRef.current = now;

    // Set a timeout to update the location
    timeoutRef.current = setTimeout(() => {
      try {
        lastLocationUpdateRef.current = location;
        setCurrentLocation(location);

        // Update URL with the new location
        const currentParams = new URLSearchParams(window.location.search);
        const oldLocation = currentParams.get('location');

        // Only update URL if location actually changed
        if (location !== oldLocation) {
          // Remove old location if exists
          currentParams.delete('location');

          // Only add new location if it's not empty
          if (location) {
            currentParams.set('location', location);
          }

          // Use replace to prevent history stack buildup
          router.replace(`/vehicles?${currentParams.toString()}`, {
            scroll: false
          });
        }
      } finally {
        processingLocationChange.current = false;
        timeoutRef.current = null;
      }
    }, 100);
  }, [currentLocation, router]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Update URL params once on mount and when URL changes
  useEffect(() => {
    const locationFromUrl = searchParams?.get('location');
    const pickupDate = searchParams?.get('pickupDate') || '';
    const pickupTime = searchParams?.get('pickupTime') || '';
    const dropoffDate = searchParams?.get('dropoffDate') || '';
    const dropoffTime = searchParams?.get('dropoffTime') || '';

    // Only update on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (locationFromUrl) {
        setCurrentLocation(locationFromUrl);
        lastLocationUpdateRef.current = locationFromUrl;
        lastLocationUpdateTimeRef.current = Date.now();
      }
      setUrlParams({
        pickupDate,
        pickupTime,
        dropoffDate,
        dropoffTime,
        location: locationFromUrl || null
      });
      return;
    }

    // For subsequent updates, only update if we're not processing a change
    // and enough time has passed since the last update
    const now = Date.now();
    const timeSinceLastUpdate = now - lastLocationUpdateTimeRef.current;

    if (!processingLocationChange.current && timeSinceLastUpdate >= 1000) {
      const newParams = {
        pickupDate,
        pickupTime,
        dropoffDate,
        dropoffTime,
        location: locationFromUrl || null
      };

      const paramsChanged = JSON.stringify(newParams) !== JSON.stringify(urlParams);

      if (paramsChanged) {
        setUrlParams(newParams);

        // Only update location if it's changed and not from a user interaction
        if (locationFromUrl !== lastLocationUpdateRef.current) {
          setCurrentLocation(locationFromUrl || undefined);
          lastLocationUpdateRef.current = locationFromUrl || undefined;
          lastLocationUpdateTimeRef.current = now;
        }
      }
    }
  }, [searchParams]);

  const fetchVehicles = useCallback(async () => {
    if (!urlParams.pickupDate || !urlParams.pickupTime || !urlParams.dropoffDate || !urlParams.dropoffTime) {
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, string> = {
        pickupDate: urlParams.pickupDate,
        pickupTime: urlParams.pickupTime,
        dropoffDate: urlParams.dropoffDate,
        dropoffTime: urlParams.dropoffTime,
      };

      const query = new URLSearchParams(Object.entries(params).filter(([_, value]) => value != null) as [string, string][]);
      const response = await fetch(`/api/vehicles?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch vehicles');

      const data = await response.json();

      // Make sure we have a valid array and filter out null/undefined items
      const vehiclesArray = Array.isArray(data.vehicles) ? data.vehicles : [];
      const validVehicles = vehiclesArray.filter((v: any) => v !== null && v !== undefined);

      // Apply normalization to ensure is_available is always present
      const normalizedVehicles = validVehicles.map((vehicle: any) => ({
        ...vehicle,
        is_available: vehicle.is_available ?? vehicle.isAvailable ?? true,
        price_per_hour: vehicle.price_per_hour || vehicle.pricePerHour || 0
      }));

      console.log('Fetched vehicles:', normalizedVehicles);
      setVehicles(normalizedVehicles);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      setVehicles([]);
      toast.error('Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  }, [urlParams]);

  // Only fetch when URL params changes
  useEffect(() => {
    const shouldFetch =
      urlParams.pickupDate &&
      urlParams.pickupTime &&
      urlParams.dropoffDate &&
      urlParams.dropoffTime;

    if (shouldFetch) {
      const timer = setTimeout(() => {
        fetchVehicles();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [urlParams, fetchVehicles]);

  const handleLocationChange = (location: string) => {
    setSelectedLocations(prev => {
      if (prev.includes(location)) {
        return prev.filter(loc => loc !== location);
      }
      return [...prev, location];
    });
  };

  // Add sorting function
  const getSortedVehicles = useCallback(() => {
    if (!vehicles.length) return [];

    // Filter out null or undefined vehicles
    const validVehicles = vehicles.filter(vehicle => vehicle !== null && vehicle !== undefined);

    if (!validVehicles.length) return [];

    switch (sortBy) {
      case 'price-low-high':
        return [...validVehicles].sort((a, b) => a.price_per_hour - b.price_per_hour);
      case 'price-high-low':
        return [...validVehicles].sort((a, b) => b.price_per_hour - a.price_per_hour);
      default:
        return validVehicles; // 'relevance' - keep original order
    }
  }, [vehicles, sortBy]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Format the datetime for display
  const formatDateTime = (date: string | null, time: string | null) => {
    if (!date || !time) return null;

    try {
      const [year, month, day] = date.split('-').map(Number);
      const [hours, minutes] = time.split(':').map(Number);

      // Create date in local timezone
      const dateObj = new Date(year, month - 1, day, hours, minutes);

      // Format in IST
      return formatDateForDisplay(dateObj);
    } catch (error) {
      logger.error('Error formatting datetime:', error);
      return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-20 md:pb-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Filter Section - Hidden on mobile */}
          <div className="hidden md:block w-1/5">
            <div className="bg-white rounded-lg shadow p-4 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
              <h2 className="text-lg font-bold mb-4">Filter</h2>

              {/* Date & Time Section */}
              <div className="mb-4">
                <h3 className="font-semibold mb-2 text-sm">Select Date & Time</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Pickup</label>
                    <div className="text-sm font-medium">
                      {formatDateTime(
                        urlParams.pickupDate,
                        urlParams.pickupTime
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Dropoff</label>
                    <div className="text-sm font-medium">
                      {formatDateTime(
                        urlParams.dropoffDate,
                        urlParams.dropoffTime
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Duration */}
              <div className="mb-4">
                <h3 className="font-semibold mb-1 text-sm">Duration</h3>
                <p className="text-orange-500 text-sm">{calculateDuration()}</p>
              </div>

              {/* Locations */}
              <div className="mb-4">
                <h3 className="font-semibold mb-2 text-sm">Locations</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes('Eragadda')}
                      onChange={() => handleLocationChange('Eragadda')}
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm">Eragadda</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes('Madhapur')}
                      onChange={() => handleLocationChange('Madhapur')}
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm">Madhapur</span>
                  </label>
                </div>
              </div>

              <button
                onClick={() => {
                  setSelectedLocations([]);
                  setSortBy('relevance');
                }}
                className="w-full bg-orange-500 text-white py-1.5 text-sm rounded-md hover:bg-orange-600 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>

          {/* Vehicles List Section */}
          <div className="flex-1">
            {/* Sort Options - Hidden on mobile */}
            <div className="hidden md:flex mb-6 items-center space-x-4">
              <span className="text-gray-600">Sort by</span>
              <div className="flex space-x-4">
                <button
                  onClick={() => setSortBy('relevance')}
                  className={`px-4 py-2 rounded-md ${sortBy === 'relevance'
                    ? 'text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-600 hover:text-orange-500'
                    }`}
                >
                  Relevance
                </button>
                <button
                  onClick={() => setSortBy('price-low-high')}
                  className={`px-4 py-2 rounded-md ${sortBy === 'price-low-high'
                    ? 'text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-600 hover:text-orange-500'
                    }`}
                >
                  Price - Low to High
                </button>
                <button
                  onClick={() => setSortBy('price-high-low')}
                  className={`px-4 py-2 rounded-md ${sortBy === 'price-high-low'
                    ? 'text-orange-500 border-b-2 border-orange-500'
                    : 'text-gray-600 hover:text-orange-500'
                    }`}
                >
                  Price - High to Low
                </button>
              </div>
            </div>

            <p className="text-gray-600 mb-6">
              *All prices are exclusive of taxes and fuel. Images used for representation purposes only, actual color may vary.
            </p>

            {vehicles.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No bikes available for the selected criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getSortedVehicles().map(vehicle => {
                  // Skip null/undefined vehicles
                  if (!vehicle) return null;

                  const durationInDays = parseInt(calculateDuration().split(' ')[0]);
                  const packagePrice = getDurationPrice(vehicle);

                  return (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={{
                        ...vehicle,
                        is_available: vehicle.is_available ?? true
                      }}
                      selectedLocation={currentLocation}
                      onLocationSelect={handleLocationSelect}
                      pickupDateTime={pickupDateTime?.toISOString()}
                      dropoffDateTime={dropoffDateTime?.toISOString()}
                      showBookingButton={true}
                    >
                      <div>
                        <p className="text-2xl font-semibold">₹{packagePrice || 0}</p>
                        <p className="text-sm text-muted-foreground">
                          {calculateDuration()} package
                        </p>
                      </div>
                    </VehicleCard>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Filter Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 flex justify-around items-center z-50">
          <button
            className="flex items-center justify-center space-x-2 text-gray-700 focus:outline-none"
            onClick={() => setShowFilters(!showFilters)}
          >
            <FaFilter className="text-[#f26e24]" />
            <span>Filter</span>
          </button>
          <div className="w-px h-6 bg-gray-300"></div>
          <button
            className="flex items-center justify-center space-x-2 text-gray-700 focus:outline-none"
            onClick={() => {
              const nextSort = sortBy === 'price-low-high'
                ? 'price-high-low'
                : sortBy === 'price-high-low'
                  ? 'relevance'
                  : 'price-low-high';
              setSortBy(nextSort);
            }}
          >
            <FaSort className="text-[#f26e24]" />
            <span>
              {sortBy === 'price-low-high'
                ? 'Price: Low to High'
                : sortBy === 'price-high-low'
                  ? 'Price: High to Low'
                  : 'Sort by'}
            </span>
          </button>
        </div>

        {/* Mobile Filter Drawer */}
        {showFilters && (
          <div className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl p-4 transform transition-transform duration-300 ease-in-out">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Filter</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {/* Date & Time Section */}
              <div className="mb-4">
                <h3 className="font-semibold mb-2 text-sm">Select Date & Time</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Pickup</label>
                    <div className="text-sm font-medium">
                      {formatDateTime(
                        urlParams.pickupDate,
                        urlParams.pickupTime
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Dropoff</label>
                    <div className="text-sm font-medium">
                      {formatDateTime(
                        urlParams.dropoffDate,
                        urlParams.dropoffTime
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Search Duration */}
              <div className="mb-4">
                <h3 className="font-semibold mb-1 text-sm">Duration</h3>
                <p className="text-orange-500 text-sm">{calculateDuration()}</p>
              </div>

              {/* Locations */}
              <div className="mb-4">
                <h3 className="font-semibold mb-2 text-sm">Locations</h3>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes('Eragadda')}
                      onChange={() => handleLocationChange('Eragadda')}
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm">Eragadda</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedLocations.includes('Madhapur')}
                      onChange={() => handleLocationChange('Madhapur')}
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm">Madhapur</span>
                  </label>
                </div>
              </div>

              <div className="mt-4">
                <button
                  onClick={() => {
                    setSelectedLocations([]);
                    setSortBy('relevance');
                    setShowFilters(false);
                  }}
                  className="w-full bg-orange-500 text-white py-2 rounded-lg mb-2"
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="w-full bg-[#f26e24] text-white py-2 rounded-lg"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 