'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { vehicles } from '@/lib/schema';
import type { InferModel } from 'drizzle-orm';

type Vehicle = InferModel<typeof vehicles>;

interface Props {
  vehicle: Vehicle;
}

export default function VehicleDetailsClient({ vehicle }: Props) {
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

  const firstImage = Array.isArray(vehicle.images) && vehicle.images.length > 0 
    ? vehicle.images[0] 
    : '/placeholder-vehicle.jpg';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="relative h-96">
            <Image
              src={firstImage}
              alt={vehicle.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{vehicle.name}</h1>
                <p className="text-lg text-gray-600">{vehicle.type}</p>
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
                  <p><span className="font-medium">Status:</span> {vehicle.status}</p>
                  <p><span className="font-medium">Location:</span> {vehicle.location}</p>
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold mb-2">Pricing</h2>
                <div className="space-y-2 text-gray-600">
                  <p><span className="font-medium">Per Day:</span> ₹{vehicle.price_per_day}</p>
                  {vehicle.price_12hrs && <p><span className="font-medium">12 Hours:</span> ₹{vehicle.price_12hrs}</p>}
                  {vehicle.price_24hrs && <p><span className="font-medium">24 Hours:</span> ₹{vehicle.price_24hrs}</p>}
                </div>
              </div>
            </div>

            {vehicle.is_available && (
              <button
                onClick={() => router.push(`/booking?vehicleId=${vehicle.id}`)}
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