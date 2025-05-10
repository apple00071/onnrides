'use client';

import Image from 'next/image';
import { Vehicle } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/currency';
import { Button } from '@/components/ui/button';
import { OptimizedImage } from '@/components/ui/optimized-image';
import { DEFAULT_VEHICLE_IMAGE } from '@/lib/utils/image-utils';

interface VehicleListProps {
  vehicles: Vehicle[];
  onBookClick: (vehicleId: string) => void;
}

export default function VehiclesList({ vehicles, onBookClick }: VehicleListProps) {
  const getLocationString = (location: string | string[]): string => {
    if (Array.isArray(location)) {
      return location.join(', ');
    }
    try {
      const parsedLocation = JSON.parse(location);
      if (Array.isArray(parsedLocation)) {
        return parsedLocation.join(', ');
      }
    } catch (_e) {
      // If parsing fails, return the original string
    }
    return location;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vehicles.map((vehicle) => (
        <div
          key={vehicle.id}
          className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow"
        >
          <div className="relative aspect-video">
            <OptimizedImage
              src={vehicle.images}
              alt={vehicle.name}
              className="w-full h-full"
              fallback={DEFAULT_VEHICLE_IMAGE}
              priority={false}
              quality={75}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-semibold mb-1">{vehicle.name}</h3>
                <p className="text-gray-500 capitalize">{vehicle.type}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold">{formatCurrency(Number(vehicle.price_per_hour))}</p>
                <p className="text-sm text-gray-500">per hour</p>
              </div>
            </div>
            <div className="flex items-center text-sm text-gray-500 mb-4">
              <span>{getLocationString(vehicle.location)}</span>
            </div>
            <Button
              onClick={() => onBookClick(vehicle.id)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              Book Now
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
} 