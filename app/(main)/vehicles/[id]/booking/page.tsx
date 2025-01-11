'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Vehicle {
  id: string;
  name: string;
  image_url: string;
  price_per_day: number;
  location: string;
  address: string;
  type: string;
}

export default function BookingSummaryPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const response = await fetch(`/api/vehicles/${params.id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch vehicle');
        }

        setVehicle(data);
      } catch (error) {
        logger.error('Error fetching vehicle:', error);
        toast.error('Failed to load vehicle details');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Vehicle Not Found</h1>
        <p className="text-gray-600 mb-6">The vehicle you're looking for doesn't exist or has been removed.</p>
        <button
          onClick={() => router.push('/vehicles')}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90"
        >
          Back to Vehicles
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">Booking Summary</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="relative h-48 rounded-lg overflow-hidden">
                  <Image
                    src={vehicle.image_url}
                    alt={vehicle.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="mt-4">
                  <h2 className="text-xl font-semibold">{vehicle.name}</h2>
                  <p className="text-gray-600">{vehicle.type}</p>
                </div>
              </div>
              <div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium text-gray-900">Pickup Location</h3>
                    <p className="text-gray-600">{vehicle.location}</p>
                    <p className="text-sm text-gray-500">{vehicle.address}</p>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Price</h3>
                    <p className="text-2xl font-bold text-primary">₹{vehicle.price_per_day}/day</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 