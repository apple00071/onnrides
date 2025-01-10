'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  registration_number: string;
  price_per_day: number;
  is_available: boolean;
  image_url: string;
  description: string;
  created_at: string;
}

type Props = {
  params: {
    id: string;
  };
};

export default function VehicleDetailsClient({ params }: Props) {
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
          <div className="relative h-96">
            <Image
              src={vehicle.image_url}
              alt={vehicle.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{vehicle.name}</h1>
                <p className="text-lg text-gray-600">{vehicle.brand} {vehicle.model} {vehicle.year}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">₹{vehicle.price_per_day}/day</p>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  vehicle.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {vehicle.is_available ? 'Available' : 'Not Available'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-lg font-semibold mb-2">Vehicle Details</h2>
                <div className="space-y-2 text-gray-600">
                  <p><span className="font-medium">Type:</span> {vehicle.type}</p>
                  <p><span className="font-medium">Color:</span> {vehicle.color}</p>
                  <p><span className="font-medium">Registration:</span> {vehicle.registration_number}</p>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-2">Description</h2>
                <p className="text-gray-600">{vehicle.description}</p>
              </div>
            </div>

            {vehicle.is_available && (
              <button
                onClick={() => router.push(`/booking?vehicle=${vehicle.id}`)}
                className="w-full py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary/90 transition-colors"
              >
                Book Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 