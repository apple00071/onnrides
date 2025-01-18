'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string[];
  price_per_day: number;
  is_available: boolean;
  image_url: string;
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

      // Fetch vehicles with query params
      const response = await fetch(`/api/vehicles?${queryParams.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch vehicles');
      }

      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid response format');
      }

      // Sort vehicles based on selected option
      let sortedVehicles = [...data];
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
            className={`px-12 py-2 text-sm font-medium rounded-md transition-colors ${
              vehicleType === 'car'
                ? 'bg-orange-500 text-white'
                : 'text-gray-500 hover:text-orange-500'
            }`}
          >
            Car
          </button>
          <button
            onClick={() => setVehicleType('bike')}
            className={`px-12 py-2 text-sm font-medium rounded-md transition-colors ${
              vehicleType === 'bike'
                ? 'bg-orange-500 text-white'
                : 'text-gray-500 hover:text-orange-500'
            }`}
          >
            Bike
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Filter Section */}
        <div className="w-full md:w-1/4 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6">Filter</h2>
          
          {/* Date & Time Section */}
          <div className="mb-6">
            <h3 className="font-semibold mb-4">Select Date & Time</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Pickup date</label>
                <div className="text-sm font-medium">
                  {formatDateTime(
                    searchParams.get('pickupDate') || '',
                    searchParams.get('pickupTime') || ''
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Dropoff date</label>
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
          <div className="mb-6">
            <h3 className="font-semibold mb-2">Search Duration</h3>
            <p className="text-orange-500">{searchDuration}</p>
          </div>

          {/* Locations */}
          <div className="mb-6">
            <h3 className="font-semibold mb-4">Locations</h3>
            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedLocations.includes('Eragadda')}
                  onChange={() => handleLocationChange('Eragadda')}
                  className="rounded text-orange-500 focus:ring-orange-500"
                />
                <span>Eragadda</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedLocations.includes('Madhapur')}
                  onChange={() => handleLocationChange('Madhapur')}
                  className="rounded text-orange-500 focus:ring-orange-500"
                />
                <span>Madhapur</span>
              </label>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedLocations([]);
              setSortBy('relevance');
              setVehicleType('car');
            }}
            className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 transition-colors"
          >
            Apply filter
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
              <p className="text-gray-500">No vehicles available for the selected criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {/* Zero Deposit Badge */}
                  <div className="relative">
                    <div className="absolute top-2 left-2 bg-white px-3 py-1 rounded-full shadow-sm z-10 flex items-center space-x-2">
                      <Image
                        src="/icons/zero-deposit.svg"
                        alt="Zero deposit"
                        width={16}
                        height={16}
                      />
                      <span className="text-sm font-medium">Zero deposit</span>
                    </div>
                  </div>

                  {/* Vehicle Image */}
                  <div className="relative h-48">
                    <Image
                      src={vehicle.image_url}
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
                      <select className="w-full p-2 border rounded-md">
                        {Array.isArray(vehicle.location) 
                          ? vehicle.location.map((loc) => (
                              <option key={loc} value={loc}>{loc}</option>
                            ))
                          : typeof vehicle.location === 'string' 
                            ? <option value={vehicle.location}>{vehicle.location}</option>
                            : <option value="">No location available</option>
                        }
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
                        <div className="text-2xl font-bold">₹{vehicle.price_per_day}</div>
                        <div className="text-xs text-gray-500">({searchDuration} included)</div>
                      </div>
                      <button
                        onClick={() => router.push(`/vehicles/${vehicle.id}?${searchParams.toString()}`)}
                        className="px-8 py-2 bg-yellow-400 text-black font-medium rounded-md hover:bg-yellow-500 transition-colors"
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