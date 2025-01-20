'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';
import type { Vehicle } from '@/lib/types';

interface VehicleDetailsClientProps {
  vehicle: Vehicle;
  searchParams: URLSearchParams;
}

export default function VehicleDetailsClient({ vehicle, searchParams }: VehicleDetailsClientProps) {
  const router = useRouter();

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
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="relative aspect-video">
          <Image
            src={vehicle.images[0] || '/placeholder.png'}
            alt={vehicle.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-2">{vehicle.name}</h1>
              <p className="text-gray-500 capitalize">{vehicle.type}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{formatCurrency(vehicle.price_per_hour)}/hour</p>
              <p className="text-sm text-gray-500">Min. {vehicle.min_booking_hours} hours</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Location</h2>
            <p className="text-gray-600">{vehicle.location.join(', ')}</p>
          </div>

          {vehicle.is_available && (
            <button
              onClick={() => router.push(`/vehicles/${vehicle.id}/booking?${searchParams.toString()}`)}
              className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium"
            >
              Book Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 