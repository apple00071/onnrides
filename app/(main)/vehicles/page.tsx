'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { format, differenceInHours, parseISO, differenceInMinutes } from 'date-fns';
import { toast } from 'react-hot-toast';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string[];
  price_per_day: number;
  is_available: boolean;
  image_url: string;
}

export default function VehiclesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('bike');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [sortBy, setSortBy] = useState('relevance');

  const pickupDate = searchParams.get('pickup') || new Date().toISOString();
  const dropoffDate = searchParams.get('dropoff') || new Date().toISOString();

  const formatDateTime = (dateStr: string) => {
    const date = parseISO(dateStr);
    return {
      time: format(date, 'HH:mm'),
      date: format(date, 'dd MMM yyyy')
    };
  };

  const pickup = formatDateTime(pickupDate);
  const dropoff = formatDateTime(dropoffDate);

  const calculateDuration = (startDate: string, endDate: string) => {
    const totalMinutes = differenceInMinutes(parseISO(endDate), parseISO(startDate));
    const days = Math.floor(totalMinutes / (24 * 60));
    const remainingMinutes = totalMinutes % (24 * 60);
    const hours = Math.floor(remainingMinutes / 60);
    const minutes = remainingMinutes % 60;

    const parts = [];
    if (days > 0) parts.push(`${days} ${days === 1 ? 'Day' : 'Days'}`);
    if (hours > 0) parts.push(`${hours} ${hours === 1 ? 'Hour' : 'Hours'}`);
    if (minutes > 0) parts.push(`${minutes} ${minutes === 1 ? 'Minute' : 'Minutes'}`);

    return parts.join(' and ');
  };

  const duration = calculateDuration(pickupDate, dropoffDate);

  const calculateTotalAmount = (pricePerDay: number) => {
    const totalMinutes = differenceInMinutes(parseISO(dropoffDate), parseISO(pickupDate));
    const totalDays = totalMinutes / (24 * 60);
    return Math.round(pricePerDay * totalDays);
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles');
      if (!response.ok) throw new Error('Failed to fetch vehicles');
      const data = await response.json();
      setVehicles(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const locations = [
    'Eragadda',
    'Madhapur'
  ];

  const handleBooking = (vehicleId: string, selectedLocation: string) => {
    if (!selectedLocation) {
      toast.error('Please select a location');
      return;
    }

    const bookingParams = new URLSearchParams({
      vehicleId,
      location: selectedLocation,
      pickup: pickupDate,
      dropoff: dropoffDate
    });

    router.push(`/booking?${bookingParams.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-8">
        {/* Filter Section */}
        <div className="w-1/4">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Filter</h2>
            
            {/* Date & Time Selection */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Select Date & Time</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1">Pickup date</label>
                  <input
                    type="datetime-local"
                    value={pickupDate}
                    className="w-full border rounded p-2"
                    readOnly
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Dropoff date</label>
                  <input
                    type="datetime-local"
                    value={dropoffDate}
                    className="w-full border rounded p-2"
                    readOnly
                  />
                </div>
              </div>
            </div>

            {/* Search Duration */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Search Duration</h3>
              <div className="text-sm text-[#f26e24] font-medium">{duration}</div>
            </div>

            {/* Location Checkboxes */}
            <div className="mb-6">
              <h3 className="font-medium mb-2">Locations</h3>
              <div className="space-y-2">
                {locations.map(location => (
                  <label key={location} className="flex items-center">
                    <input type="checkbox" className="mr-2" />
                    <span className="text-sm">{location}</span>
                  </label>
                ))}
              </div>
            </div>

            <button className="w-full bg-[#f26e24] text-white py-2 rounded-lg hover:bg-[#e05d13]">
              Apply filter
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1">
          {/* Top Bar */}
          <div className="flex flex-col items-center mb-6">
            {/* Toggle Switch UI */}
            <div className="bg-gray-100 p-1 rounded-full mb-6">
              <div className="relative flex">
                <button 
                  className={`px-6 py-2 rounded-full transition-all duration-300 ${
                    selectedType === 'bike' 
                      ? 'bg-[#f26e24] text-white' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setSelectedType('bike')}
                >
                  Bikes
                </button>
                <button 
                  className={`px-6 py-2 rounded-full transition-all duration-300 ${
                    selectedType === 'car' 
                      ? 'bg-[#f26e24] text-white' 
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                  onClick={() => setSelectedType('car')}
                >
                  Cars
                </button>
              </div>
            </div>

            {/* Sort UI */}
            <div className="w-full border-b">
              <div className="flex items-center">
                <span className="text-sm font-medium mr-4">Sort by</span>
                <div className="flex">
                  <button
                    className={`px-4 py-2 text-sm ${
                      sortBy === 'relevance' 
                        ? 'text-[#f26e24] border-b-2 border-[#f26e24]' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    onClick={() => setSortBy('relevance')}
                  >
                    Relevance
                  </button>
                  <button
                    className={`px-4 py-2 text-sm ${
                      sortBy === 'price_low' 
                        ? 'text-[#f26e24] border-b-2 border-[#f26e24]' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    onClick={() => setSortBy('price_low')}
                  >
                    Price - Low to High
                  </button>
                  <button
                    className={`px-4 py-2 text-sm ${
                      sortBy === 'price_high' 
                        ? 'text-[#f26e24] border-b-2 border-[#f26e24]' 
                        : 'text-gray-600 hover:text-gray-800'
                    }`}
                    onClick={() => setSortBy('price_high')}
                  >
                    Price - High to Low
                  </button>
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            *All prices are exclusive of taxes and fuel. Images used for representation purposes only, actual color may vary.
          </p>

          {/* Vehicle Cards Grid */}
          <div className="grid grid-cols-3 gap-6">
            {vehicles
              .filter(v => selectedType === 'all' || v.type === selectedType)
              .map((vehicle) => (
                <div key={vehicle.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                  {/* Image */}
                  <div className="relative h-48 w-full">
                    <Image
                      src={vehicle.image_url}
                      alt={vehicle.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold">{vehicle.name}</h3>
                      {vehicle.type === 'bike' && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="mr-1">🛡️</span>
                          Zero deposit
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <select 
                        className="w-full border rounded p-2 text-sm"
                        value={selectedLocation}
                        onChange={(e) => setSelectedLocation(e.target.value)}
                      >
                        <option value="">Available at</option>
                        {vehicle.location.map(loc => (
                          <option key={loc} value={loc}>{loc}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-between items-center text-sm mb-3">
                      <div>
                        <div className="text-gray-600">{pickup.time}</div>
                        <div>{pickup.date}</div>
                      </div>
                      <div className="text-gray-600">to</div>
                      <div>
                        <div className="text-gray-600">{dropoff.time}</div>
                        <div>{dropoff.date}</div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-xl font-bold">₹{calculateTotalAmount(vehicle.price_per_day)}</span>
                      </div>
                      <button 
                        onClick={() => handleBooking(vehicle.id, selectedLocation)}
                        className="bg-[#f26e24] text-white px-6 py-2 rounded hover:bg-[#e05d13] text-sm"
                      >
                        Book
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
} 