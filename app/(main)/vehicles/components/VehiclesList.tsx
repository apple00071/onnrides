'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Vehicle } from '@/lib/types';
import Link from 'next/link';
import { formatCurrency } from '@/lib/utils';

interface VehicleListProps {
  vehicles: Vehicle[];
  searchParams: URLSearchParams;
}

export default function VehiclesList({ vehicles, searchParams }: VehicleListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vehicles.map((vehicle) => (
        <div
          key={vehicle.id}
          className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="relative aspect-video">
            <Image
              src={vehicle.images[0] || '/placeholder.png'}
              alt={vehicle.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-semibold">{vehicle.name}</h3>
                <p className="text-sm text-gray-500 capitalize">{vehicle.type}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatCurrency(vehicle.price_per_hour)}</p>
                <p className="text-sm text-gray-500">per hour</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-500 mb-4">
              <span>{vehicle.location.join(', ')}</span>
            </div>
            <Link
              href={`/vehicles/${vehicle.id}?${searchParams.toString()}`}
              className="block w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 text-center"
            >
              View Details
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
} 