'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Loader } from '@/components/ui/loader';
import { Vehicle } from './types';

import { formatCurrency } from '@/lib/utils/currency';

interface VehicleDetailsClientProps {
  vehicleId: string;
}

export default function VehicleDetailsClient({ vehicleId }: VehicleDetailsClientProps) {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const response = await fetch(`/api/vehicles/${vehicleId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch vehicle details');
        }
        const data = await response.json();
        setVehicle(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load vehicle');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [vehicleId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader className="w-8 h-8" />
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-red-600">Error</h2>
        <p className="mt-2 text-gray-600">{error || 'Vehicle not found'}</p>
        <Link href="/vehicles" className="mt-4 text-primary hover:underline">
          Back to Vehicles
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="relative h-96">
          <Image
            src={vehicle.image_url || '/images/placeholder.jpg'}
            alt={vehicle.name}
            fill
            className="object-cover rounded-lg"
          />
        </div>

        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{vehicle.name}</h1>
            <p className="text-gray-600 mt-2">{vehicle.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold">Transmission</h3>
              <p>{vehicle.transmission}</p>
            </div>
            <div>
              <h3 className="font-semibold">Fuel Type</h3>
              <p>{vehicle.fuel_type}</p>
            </div>
            <div>
              <h3 className="font-semibold">Mileage</h3>
              <p>{vehicle.mileage} km/l</p>
            </div>
            <div>
              <h3 className="font-semibold">Seating Capacity</h3>
              <p>{vehicle.seating_capacity} persons</p>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold">{formatCurrency(vehicle.price_per_day || 0)}/day</h2>
          </div>

          <Link
            href={`/booking-summary?vehicleId=${vehicle.id}`}
            className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-dark transition-colors"
          >
            Book Now
          </Link>
        </div>
      </div>
    </div>
  );
} 