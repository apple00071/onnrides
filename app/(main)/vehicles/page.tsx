'use client';

import { useState, useEffect } from 'react';
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
} from '@/app/components/ui/table';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string[];
  quantity: number;
  price_per_day: number;
  price_12hrs: number;
  price_24hrs: number;
  price_7days: number;
  price_15days: number;
  price_30days: number;
  min_booking_hours: number;
  is_available: boolean;
  images: string[];
  status: 'active' | 'maintenance' | 'retired';
  created_at?: string;
  updated_at?: string;
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
  const [sortBy, setSortBy] = useState('relevance');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [vehicleType, setVehicleType] = useState<'car' | 'bike'>('car');
  const [searchDuration, setSearchDuration] = useState<string>('');

  const calculateDuration = (pickupStr: string, dropoffStr: string) => {
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
  };

  const fetchVehicles = async () => {
    try {
      // Get search params
      const pickupDate = searchParams.get('pickupDate');
      const pickupTime = searchParams.get('pickupTime');
      const dropoffDate = searchParams.get('dropoffDate');
      const dropoffTime = searchParams.get('dropoffTime');

      // Calculate duration if dates are available
      if (pickupDate && pickupTime && dropoffDate && dropoffTime) {
        const pickupDateTime = `${pickupDate}T${pickupTime}`;
        const dropoffDateTime = `${dropoffDate}T${dropoffTime}`;
        const duration = calculateDuration(pickupDateTime, dropoffDateTime);
        setSearchDuration(duration);
      }

      // Build query string
      const queryParams = new URLSearchParams();
      if (pickupDate) queryParams.append('pickupDate', pickupDate);
      if (pickupTime) queryParams.append('pickupTime', pickupTime);
      if (dropoffDate) queryParams.append('dropoffDate', dropoffDate);
      if (dropoffTime) queryParams.append('dropoffTime', dropoffTime);
      if (selectedLocations.length > 0) {
        queryParams.append('locations', selectedLocations.join(','));
      }
      queryParams.append('type', vehicleType);

      logger.info('Fetching vehicles with params:', queryParams.toString());
      logger.info('Current vehicle type:', vehicleType);

      // Fetch vehicles with query params
      const response = await fetch(`/api/vehicles?${queryParams.toString()}`);
      const responseText = await response.text();
      logger.info('Raw response:', responseText);

      if (!response.ok) {
        let error;
        try {
          error = JSON.parse(responseText);
        } catch (e) {
          error = { message: responseText };
        }
        throw new Error(error.message || 'Failed to fetch vehicles');
      }

      const data = JSON.parse(responseText);
      logger.info('Parsed vehicles data:', data);

      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }

      // Filter vehicles based on type
      const filteredVehicles = data.filter(vehicle => {
        // Filter by selected locations if any are selected
        if (selectedLocations.length > 0 && !selectedLocations.some(loc => vehicle.location.includes(loc))) {
          return false;
        }
        
        // Ensure prices are numbers
        vehicle.price_per_day = Number(vehicle.price_per_day);
        vehicle.price_12hrs = Number(vehicle.price_12hrs);
        vehicle.price_24hrs = Number(vehicle.price_24hrs);
        vehicle.price_7days = Number(vehicle.price_7days);
        vehicle.price_15days = Number(vehicle.price_15days);
        vehicle.price_30days = Number(vehicle.price_30days);
        
        // Ensure images is an array
        vehicle.images = Array.isArray(vehicle.images) ? vehicle.images : [];
        
        return true; // Type filtering is now done on the server
      });

      logger.info('Filtered vehicles:', filteredVehicles);

      // Sort vehicles based on selected option
      const sortedVehicles = [...filteredVehicles];
      if (sortBy === 'price-low-high') {
        sortedVehicles.sort((a, b) => a.price_per_day - b.price_per_day);
      } else if (sortBy === 'price-high-low') {
        sortedVehicles.sort((a, b) => b.price_per_day - a.price_per_day);
      }

      setVehicles(sortedVehicles);
    } catch (error) {
      logger.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [searchParams, sortBy, selectedLocations, vehicleType]);

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
  const formatDateTime = (date: string, time: string) => {
    if (!date || !time) return '';
    const datetime = new Date(`${date}T${time}`);
    return datetime.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="container mx-auto px-4 py-8">
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
        {/* Filter Section - Reduced size */}
        <div className="w-full md:w-1/5 bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-bold mb-4">Filter</h2>
          
          {/* Date & Time Section */}
          <div className="mb-4">
            <h3 className="font-semibold mb-2 text-sm">Select Date & Time</h3>
            <div className="space-y-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Pickup</label>
                <div className="text-sm font-medium">
                  {formatDateTime(
                    searchParams.get('pickupDate') || '',
                    searchParams.get('pickupTime') || ''
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Dropoff</label>
                <div className="text-sm font-medium">
                  {formatDateTime(
                    searchParams.get('dropoffDate') || '',
                    searchParams.get('dropoffTime') || ''
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

        {/* Vehicles List Section */}
        <div className="flex-1">
          {/* Sort Options */}
          <div className="mb-6 flex items-center space-x-4">
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
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Vehicle Image */}
                  <div className="relative h-48">
                    <Image
                      src={vehicle.image_url || vehicle.images?.[0] || '/placeholder-vehicle.jpg'}
                      alt={vehicle.name}
                      fill
                      className="object-contain p-4"
                    />
                  </div>

                  {/* Vehicle Details */}
                  <div className="p-4">
                    <h2 className="text-xl font-semibold text-center mb-4">{vehicle.name}</h2>
                    
                    {/* Location Dropdown */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Available at</label>
                      <select 
                        className="w-full p-2 border rounded-md text-sm"
                        defaultValue={vehicle.location[0] || ''}
                      >
                        {vehicle.location.map((loc: string) => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    {/* Booking Time */}
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <div>
                        <div>{formatDateTime(
                          searchParams.get('pickupDate') || '',
                          searchParams.get('pickupTime') || ''
                        ).split(',')[0]}</div>
                        <div className="font-medium">{formatDateTime(
                          searchParams.get('pickupDate') || '',
                          searchParams.get('pickupTime') || ''
                        ).split(',')[1]}</div>
                      </div>
                      <div className="text-center">to</div>
                      <div className="text-right">
                        <div>{formatDateTime(
                          searchParams.get('dropoffDate') || '',
                          searchParams.get('dropoffTime') || ''
                        ).split(',')[0]}</div>
                        <div className="font-medium">{formatDateTime(
                          searchParams.get('dropoffDate') || '',
                          searchParams.get('dropoffTime') || ''
                        ).split(',')[1]}</div>
                      </div>
                    </div>

                    {/* Price and Book Button */}
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-2xl font-bold">
                          {formatCurrency(calculateBookingPrice(
                            vehicle,
                            new Date(searchParams.get('pickupDate') + 'T' + (searchParams.get('pickupTime') || '00:00')),
                            new Date(searchParams.get('dropoffDate') + 'T' + (searchParams.get('dropoffTime') || '00:00'))
                          ))}
                        </div>
                        <div className="text-xs text-gray-500">
                          {searchDuration} total
                        </div>
                      </div>
                      <button
                        onClick={() => router.push(`/vehicles/${vehicle.id}?${searchParams.toString()}`)}
                        className="px-8 py-2 bg-[#f26e24] text-white font-medium rounded-md hover:bg-[#d85e1c] transition-colors"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 