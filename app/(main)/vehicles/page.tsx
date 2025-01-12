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

  const fetchVehicles = async () => {
    try {
      // Get search params
      const pickupDate = searchParams.get('pickupDate');
      const pickupTime = searchParams.get('pickupTime');
      const dropoffDate = searchParams.get('dropoffDate');
      const dropoffTime = searchParams.get('dropoffTime');

      // Build query string
      const queryParams = new URLSearchParams();
      if (pickupDate) queryParams.append('pickupDate', pickupDate);
      if (pickupTime) queryParams.append('pickupTime', pickupTime);
      if (dropoffDate) queryParams.append('dropoffDate', dropoffDate);
      if (dropoffTime) queryParams.append('dropoffTime', dropoffTime);

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

      setVehicles(data);
    } catch (error) {
      logger.error('Error fetching vehicles:', error);
      toast.error('Failed to load vehicles. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (vehicles.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Available Vehicles</h1>
        <div className="text-center py-12">
          <p className="text-gray-500">No vehicles available for the selected dates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Available Vehicles</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle) => (
          <div
            key={vehicle.id}
            className="bg-white rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => router.push(`/vehicles/${vehicle.id}?pickupDate=${searchParams.get('pickupDate')}&pickupTime=${searchParams.get('pickupTime')}&dropoffDate=${searchParams.get('dropoffDate')}&dropoffTime=${searchParams.get('dropoffTime')}`)}
          >
            <div className="relative h-48">
              <Image
                src={vehicle.image_url}
                alt={vehicle.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{vehicle.name}</h2>
              <p className="text-gray-600 mb-2">{vehicle.type}</p>
              <div className="flex justify-between items-center">
                <p className="text-lg font-bold text-primary">₹{vehicle.price_per_day}/day</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  vehicle.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {vehicle.is_available ? 'Available' : 'Not Available'}
                </span>
              </div>
              {vehicle.location && vehicle.location.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Location: {vehicle.location.join(', ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 