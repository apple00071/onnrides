'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { calculateBookingPrice, formatCurrency } from '@/lib/utils';
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

  const calculateDuration = useCallback((pickupStr: string, dropoffStr: string) => {
    try {
      const pickup = new Date(pickupStr);
      const dropoff = new Date(dropoffStr);
      const diff = dropoff.getTime() - pickup.getTime();
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      let duration = '';
      if (days > 0) duration += `${days} ${days === 1 ? 'Day' : 'Days'}`;
      if (hours > 0) duration += `${duration ? ', ' : ''}${hours} ${hours === 1 ? 'Hour' : 'Hours'}`;
      if (minutes > 0) duration += `${duration ? ' and ' : ''}${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'}`;

      return duration || '0 Minutes';
    } catch (error) {
      logger.error('Error calculating duration:', error);
      return '0 Minutes';
    }
  }, []);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [vehicleType, setVehicleType] = useState<'car' | 'bike'>('car');
  const [previousType, setPreviousType] = useState<'car' | 'bike'>('car');
  const [searchDuration, setSearchDuration] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string | undefined>(undefined);

  type UrlParamsType = {
    pickupDate: string | null;
    pickupTime: string | null;
    dropoffDate: string | null;
    dropoffTime: string | null;
    type: 'car' | 'bike' | null;
    location: string | null;
  };

  const initialUrlParams: UrlParamsType = {
    pickupDate: searchParams.get('pickupDate'),
    pickupTime: searchParams.get('pickupTime'),
    dropoffDate: searchParams.get('dropoffDate'),
    dropoffTime: searchParams.get('dropoffTime'),
    type: (searchParams.get('type') as 'car' | 'bike' | null) ?? 'car',
    location: searchParams.get('location')
  };

  const [urlParams, setUrlParams] = useState<UrlParamsType>(initialUrlParams);

  const handleLocationSelect = useCallback((location: string) => {
    logger.info('Location selected:', { location, vehicleType });
    
    // Skip if the location hasn't actually changed
    if (location === currentLocation) {
      logger.info('Skipping location update - no change', { location, currentLocation });
      return;
    }

    // Only update the URL if this was a user-initiated selection
    setCurrentLocation(location);
    
    // Update URL only if location is explicitly selected
    if (location) {
      const newSearchParams = new URLSearchParams(searchParams.toString());
      newSearchParams.set('location', location);
      router.replace(`/vehicles?${newSearchParams.toString()}`, { scroll: false });
    }
  }, [currentLocation, vehicleType, router, searchParams]);

  // Update URL params once on mount and when URL changes
  useEffect(() => {
    const pickupDate = searchParams.get('pickupDate') || '';
    const pickupTime = searchParams.get('pickupTime') || '';
    const dropoffDate = searchParams.get('dropoffDate') || '';
    const dropoffTime = searchParams.get('dropoffTime') || '';
    const type = (searchParams.get('type') as 'car' | 'bike') || 'car';

    // Don't automatically set location from URL params
    setUrlParams({
      pickupDate,
      pickupTime,
      dropoffDate,
      dropoffTime,
      type,
      location: null // Reset location to prevent auto-selection
    });
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

      if (urlParams.location) {
        params.location = urlParams.location;
      }

      const query = new URLSearchParams(Object.entries(params).filter(([_, value]) => value != null) as [string, string][]);
      const response = await fetch(`/api/vehicles?${query.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      
      const data = await response.json();
      setVehicles(data.vehicles || []);
    } catch (error) {
      logger.error('Error fetching vehicles:', error);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  }, [vehicleType, urlParams]);

  // Only fetch when URL params or vehicle type changes
  useEffect(() => {
    if (urlParams.pickupDate && urlParams.pickupTime && urlParams.dropoffDate && urlParams.dropoffTime) {
      fetchVehicles();
    }
  }, [urlParams, fetchVehicles]);

  // Handle vehicle type change
  useEffect(() => {
    if (vehicleType !== previousType) {
      logger.info('Vehicle type changed at page level:', {
        from: previousType,
        to: vehicleType
      });
      
      // Reset location in URL when type changes
      const currentParams = new URLSearchParams(searchParams.toString());
      currentParams.delete('location');
      currentParams.set('type', vehicleType);
      router.push(`/vehicles?${currentParams.toString()}`);
      
      setPreviousType(vehicleType);
    }
  }, [vehicleType, previousType, router, searchParams]);

  const handleLocationChange = (location: string) => {
    setSelectedLocations(prev => {
      if (prev.includes(location)) {
        return prev.filter(loc => loc !== location);
      }
      return [...prev, location];
    });
  };

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
      return datetime.toLocaleString('en-US', {
        month: 'short',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return '';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 pb-20 md:pb-8">
      {/* Centered Vehicle Type Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-lg border border-gray-200 p-1 bg-white shadow-sm">
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
              <p className="text-orange-500 text-sm">{searchDuration}</p>
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
              {vehicles.map(vehicle => {
                return (
                  <VehicleCard
                    key={vehicle.id}
                    vehicle={{
                      ...vehicle,
                      available: vehicle.is_available ?? true
                    }}
                    selectedLocation={currentLocation}
                    onLocationSelect={handleLocationSelect}
                    pickupDateTime={urlParams.pickupTime ?? undefined}
                    dropoffDateTime={urlParams.dropoffTime ?? undefined}
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
              <p className="text-orange-500 text-sm">{searchDuration}</p>
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
  );
} 