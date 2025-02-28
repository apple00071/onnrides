'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { calculateBookingPrice, formatCurrency } from '@/lib/utils';
import { toIST, formatDateTimeIST } from '@/lib/utils/timezone';
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

interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string[];
  quantity: number;
  price_per_hour: number;
  min_booking_hours: number;
  is_available: boolean;
  images: string[];
  status: 'active' | 'maintenance' | 'retired';
  created_at: string;
  updated_at: string;
  pricing: {
    price_per_hour: number;
    total_hours: number;
    chargeable_hours: number;
    total_price: number;
  };
  image_url?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  transmission?: string;
  fuel_type?: string;
  seating_capacity?: number;
}

export default function VehiclesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('price-low-high');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [vehicleType, setVehicleType] = useState<'car' | 'bike'>('bike');
  const [previousType, setPreviousType] = useState<'car' | 'bike'>('bike');
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
    type: 'car' | 'bike';
    location: string | null;
  }>({
    pickupDate: '',
    pickupTime: '',
    dropoffDate: '',
    dropoffTime: '',
    type: 'bike',
    location: null
  });

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
  }, [currentLocation, vehicleType, router]);

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
    const locationFromUrl = searchParams.get('location');
    const pickupDate = searchParams.get('pickupDate') || '';
    const pickupTime = searchParams.get('pickupTime') || '';
    const dropoffDate = searchParams.get('dropoffDate') || '';
    const dropoffTime = searchParams.get('dropoffTime') || '';
    const type = (searchParams.get('type') as 'car' | 'bike') || 'bike';

    // Only update on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      setVehicleType(type);
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
        type,
        location: locationFromUrl
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
        type,
        location: locationFromUrl
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
        type: vehicleType
      };

      const query = new URLSearchParams(Object.entries(params).filter(([_, value]) => value != null) as [string, string][]);
      const response = await fetch(`/api/vehicles?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      setVehicles([]);
      toast.error('Failed to fetch vehicles');
    } finally {
      setLoading(false);
    }
  }, [vehicleType, urlParams]);

  // Only fetch when URL params or vehicle type changes
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

  // Handle vehicle type change
  useEffect(() => {
    if (!isInitialMount.current && vehicleType !== previousType) {
      // Reset location when vehicle type changes
      setCurrentLocation(undefined);
      setPreviousType(vehicleType);
      
      // Update URL with new type and remove location
      const currentParams = new URLSearchParams(window.location.search);
      currentParams.delete('location');
      currentParams.set('type', vehicleType);
      
      // Use replace to prevent history stack buildup
      router.replace(`/vehicles?${currentParams.toString()}`, { 
        scroll: false 
      });
    }
  }, [vehicleType, previousType, router]);

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
    
    switch (sortBy) {
      case 'price-low-high':
        return [...vehicles].sort((a, b) => a.price_per_hour - b.price_per_hour);
      case 'price-high-low':
        return [...vehicles].sort((a, b) => b.price_per_hour - a.price_per_hour);
      default:
        return vehicles; // 'relevance' - keep original order
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
    if (!date || !time) return '';
    try {
      const datetime = new Date(`${date}T${time}`);
      if (!isNaN(datetime.getTime())) {
        return formatDateTimeIST(datetime);
      }
      return '';
    } catch (error) {
      return '';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-20 md:pb-8">
      <div className="flex flex-col gap-6">
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white shadow-sm">
            <button
              onClick={() => setVehicleType('bike')}
              className={`px-8 py-2 text-sm font-medium rounded-md transition-colors ${
                vehicleType === 'bike'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-500 hover:text-orange-500'
              }`}
            >
              Bikes
            </button>
            <button
              onClick={() => setVehicleType('car')}
              className={`px-8 py-2 text-sm font-medium rounded-md transition-colors ${
                vehicleType === 'car'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-500 hover:text-orange-500'
              }`}
            >
              Cars
            </button>
          </div>
        </div>

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
                  className={`px-4 py-2 rounded-md ${
                    sortBy === 'relevance'
                      ? 'text-orange-500 border-b-2 border-orange-500'
                      : 'text-gray-600 hover:text-orange-500'
                  }`}
                >
                  Relevance
                </button>
                <button
                  onClick={() => setSortBy('price-low-high')}
                  className={`px-4 py-2 rounded-md ${
                    sortBy === 'price-low-high'
                      ? 'text-orange-500 border-b-2 border-orange-500'
                      : 'text-gray-600 hover:text-orange-500'
                  }`}
                >
                  Price - Low to High
                </button>
                <button
                  onClick={() => setSortBy('price-high-low')}
                  className={`px-4 py-2 rounded-md ${
                    sortBy === 'price-high-low'
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
                <p className="text-gray-500">No {vehicleType}s available for the selected criteria.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getSortedVehicles().map(vehicle => {
                  return (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={{
                        ...vehicle,
                        available: vehicle.is_available ?? true
                      }}
                      selectedLocation={currentLocation}
                      onLocationSelect={handleLocationSelect}
                      pickupDateTime={`${urlParams.pickupDate}T${urlParams.pickupTime}`}
                      dropoffDateTime={`${urlParams.dropoffDate}T${urlParams.dropoffTime}`}
                    />
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