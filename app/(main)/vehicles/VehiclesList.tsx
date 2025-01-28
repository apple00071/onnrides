'use client';

import Image from 'next/image';
import { Vehicle } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
            <Image
              src={Array.isArray(vehicle.images) ? vehicle.images[0] : vehicle.images}
              alt={vehicle.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h3 className="text-lg font-semibold mb-1">{vehicle.name}</h3>
                <p className="text-gray-500 capitalize">{vehicle.type}</p>
                <p className="text-gray-500">{getLocationString(vehicle.location)}</p>
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