'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface Vehicle {
  id: string;
  name: string;
  description: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  transmission: string;
  fuel_type: string;
  mileage: number;
  seating_capacity: number;
  price_per_day: number;
  is_available: boolean;
  image_url: string;
  location: string;
  created_at: string;
}

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState<'bike' | 'car'>('car');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [selectedVehicleLocations, setSelectedVehicleLocations] = useState<{ [key: string]: string }>({});
  const searchParams = useSearchParams();

  const locations = ['Eragadda', 'Madhapur'];

  const calculateDuration = () => {
    const pickup = searchParams.get('pickup');
    const dropoff = searchParams.get('dropoff');

    if (!pickup || !dropoff) return '30 Minutes';

    try {
      const pickupTime = new Date(pickup);
      const dropoffTime = new Date(dropoff);
      
      const diffInMinutes = Math.round((dropoffTime.getTime() - pickupTime.getTime()) / (1000 * 60));
      const days = Math.floor(diffInMinutes / (24 * 60));
      const remainingMinutes = diffInMinutes % (24 * 60);
      const hours = Math.floor(remainingMinutes / 60);
      const minutes = remainingMinutes % 60;

      if (days > 0) {
        if (minutes > 0) {
          return `${days} Days, ${minutes} Minutes`;
        }
        return `${days} Days`;
      }

      const parts = [];
      if (hours > 0) {
        parts.push(`${hours} Hours`);
      }
      if (minutes > 0) {
        parts.push(`${minutes} Minutes`);
      }
      return parts.join(' and ');
    } catch (error) {
      return '30 Minutes';
    }
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).replace(/-/g, ' ');
  };

  const formatTimeDisplay = (timeStr: string | null) => {
    if (!timeStr) return '';
    try {
      const [hours, minutes] = timeStr.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch (error) {
      return '';
    }
  };

  const calculateTotalPrice = (pricePerDay: number) => {
    const pickup = searchParams.get('pickup');
    const dropoff = searchParams.get('dropoff');

    if (!pickup || !dropoff) return pricePerDay;

    try {
      const pickupTime = new Date(pickup);
      const dropoffTime = new Date(dropoff);
      
      // Calculate the difference in days
      const diffInDays = Math.ceil((dropoffTime.getTime() - pickupTime.getTime()) / (1000 * 60 * 60 * 24));
      
      // Return total price
      return pricePerDay * diffInDays;
    } catch (error) {
      console.error('Error calculating price:', error);
      return pricePerDay;
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => vehicle.type.toLowerCase() === vehicleType);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const queryParams = new URLSearchParams();
        if (vehicleType) queryParams.set('type', vehicleType);
        if (selectedLocation) queryParams.set('location', selectedLocation);
        
        const pickup = searchParams.get('pickup');
        const dropoff = searchParams.get('dropoff');
        if (pickup) queryParams.set('pickup', pickup);
        if (dropoff) queryParams.set('dropoff', dropoff);

        const response = await fetch(`/api/vehicles?${queryParams.toString()}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch vehicles: ${response.statusText}`);
        }

        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid response format from server');
        }

        setVehicles(data.map(vehicle => ({
          ...vehicle,
          price_per_day: parseFloat(vehicle.price_per_day)
        })));
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        setError(err instanceof Error ? err.message : 'Failed to load vehicles');
        toast.error('Failed to load vehicles. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [vehicleType, selectedLocation, searchParams]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500 mb-4">{error}</div>
        <button
          onClick={() => window.location.reload()}
          className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90"
        >
          Retry
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  const handleVehicleLocationChange = async (vehicleId: string, location: string) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ location }),
      });

      if (!response.ok) {
        throw new Error('Failed to update location');
      }

      const updatedVehicle = await response.json();
      setSelectedVehicleLocations(prev => ({
        ...prev,
        [vehicleId]: location
      }));
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Failed to update location');
    }
  };

  // Parse date and time from URL
  const parseDateTime = (dateTimeStr: string | null): { date: string, time: string } => {
    if (!dateTimeStr) return { date: '', time: '' };
    try {
      // Example input: 2025-01-05T00:30 or 2025-01-05T20:00
      const [datePart, timePart] = dateTimeStr.split('T');
      
      // Format the date
      const date = new Date(datePart);
      const formattedDate = date.toISOString().split('T')[0];

      // Format the time (keep 24-hour format for input)
      const formattedTime = timePart.slice(0, 5); // Get HH:mm part

      return {
        date: formattedDate,
        time: formattedTime
      };
    } catch (error) {
      console.error('Date parsing error:', error);
      return { date: '', time: '' };
    }
  };

  // Get pickup and dropoff details
  const pickup = searchParams.get('pickup');
  const dropoff = searchParams.get('dropoff');
  const pickupDateTime = parseDateTime(pickup);
  const dropoffDateTime = parseDateTime(dropoff);

  return (
    <div className="max-w-[1366px] mx-auto">
      <div className="text-sm text-gray-500 py-4 text-center bg-gray-50">
        *All prices are exclusive of taxes and fuel. Images used for representation purposes only, actual color may vary.
      </div>

      <div className="flex gap-6">
        {/* Filter Sidebar */}
        <div className="w-72 bg-white shadow-md min-h-screen">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-6">Filter</h2>

            {/* Date & Time Selection */}
            <div className="mb-6">
              <h3 className="font-medium mb-4">Select Date & Time</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Pickup date & time</label>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center gap-1">
                      <input 
                        type="text" 
                        className="w-[110px] p-2 border-none text-sm focus:ring-0"
                        value={pickup ? formatDateDisplay(new Date(pickupDateTime.date)) : ''}
                        readOnly
                      />
                      <input 
                        type="text" 
                        className="w-[80px] p-2 border-none text-sm focus:ring-0"
                        value={formatTimeDisplay(pickupDateTime.time)}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Dropoff date & time</label>
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center gap-1">
                      <input 
                        type="text" 
                        className="w-[110px] p-2 border-none text-sm focus:ring-0"
                        value={dropoff ? formatDateDisplay(new Date(dropoffDateTime.date)) : ''}
                        readOnly
                      />
                      <input 
                        type="text" 
                        className="w-[80px] p-2 border-none text-sm focus:ring-0"
                        value={formatTimeDisplay(dropoffDateTime.time)}
                        readOnly
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Duration */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Search Duration</h3>
              <div className="text-sm text-gray-600">{calculateDuration()}</div>
            </div>

            {/* Location Search */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Search by location</h3>
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search Location"
                    className="w-full p-2 pr-8 border border-gray-200 rounded text-sm"
                  />
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-2 top-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {locations.map((location) => (
                    <label key={location} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#f26e24] focus:ring-[#f26e24]"
                        checked={selectedLocation === location}
                        onChange={() => setSelectedLocation(location === selectedLocation ? '' : location)}
                      />
                      <span className="text-sm text-gray-700">{location}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Vehicle Model Search */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Search by {vehicleType} model</h3>
              <div className="relative">
                <input
                  type="text"
                  placeholder={`Search ${vehicleType} Model`}
                  className="w-full p-2 pr-8 border border-gray-200 rounded text-sm"
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute right-2 top-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Apply Filter Button */}
            <button className="w-full bg-[#FFB800] text-black font-medium py-2 px-4 rounded hover:bg-[#F4A900] transition-colors">
              Apply filter
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 px-6 py-4">
          {/* Centered Toggle Switch */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center bg-gray-100 rounded-full p-1">
              <button
                onClick={() => setVehicleType('bike')}
                className={`px-8 py-2 rounded-full text-sm font-medium transition-colors ${
                  vehicleType === 'bike'
                    ? 'bg-white text-[#f26e24] shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Bike
              </button>
              <button
                onClick={() => setVehicleType('car')}
                className={`px-8 py-2 rounded-full text-sm font-medium transition-colors ${
                  vehicleType === 'car'
                    ? 'bg-white text-[#f26e24] shadow-sm'
                    : 'text-gray-600'
                }`}
              >
                Car
              </button>
            </div>
          </div>

          {filteredVehicles.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
              <h2 className="text-2xl font-semibold mb-4">No {vehicleType}s Available</h2>
              <p className="text-gray-600">Try different dates or location.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                >
                  <div className="p-4 flex flex-col h-full">
                    <div className="relative h-36 w-[180px] mx-auto mb-4">
                      <Image
                        src={vehicle.image_url}
                        alt={vehicle.name}
                        fill
                        className="object-contain"
                        sizes="180px"
                      />
                    </div>
                    <h2 className="text-xl font-semibold text-center mb-4">{vehicle.name}</h2>

                    <div className="mb-4">
                      <div className="text-sm text-gray-500 mb-1">Available at</div>
                      <select
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                        value={selectedVehicleLocations[vehicle.id] || vehicle.location}
                        onChange={(e) => handleVehicleLocationChange(vehicle.id, e.target.value)}
                      >
                        {locations.map((loc) => (
                          <option key={loc} value={loc}>
                            {loc}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-4">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {formatTimeDisplay(pickupDateTime.time)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {pickup ? formatDateDisplay(new Date(pickupDateTime.date)) : ''}
                        </div>
                      </div>
                      <div className="text-sm text-gray-400">to</div>
                      <div className="flex-1 text-right">
                        <div className="text-sm font-medium">
                          {formatTimeDisplay(dropoffDateTime.time)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {dropoff ? formatDateDisplay(new Date(dropoffDateTime.date)) : ''}
                        </div>
                      </div>
                    </div>

                    <div className="mt-auto">
                      <div className="flex items-baseline mb-3">
                        <span className="text-xl font-bold">₹ {calculateTotalPrice(vehicle.price_per_day)}</span>
                        <span className="text-sm text-gray-500 ml-1">total</span>
                      </div>
                      <Link
                        href={`/vehicles/${vehicle.id}/booking?${new URLSearchParams({
                          pickup: searchParams.get('pickup') || '',
                          dropoff: searchParams.get('dropoff') || '',
                          location: selectedVehicleLocations[vehicle.id] || vehicle.location || ''
                        }).toString()}`}
                        className="block w-full bg-[#FFB800] text-black text-center py-3 rounded-lg font-medium hover:bg-[#F4A900] transition-colors"
                      >
                        Book
                      </Link>
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