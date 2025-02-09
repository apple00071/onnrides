'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { LocationDropdown } from '@/components/location-dropdown';
import { useState } from 'react';

interface VehicleCardProps {
  id: string;
  name: string;
  type: string;
  pricePerHour: number;
  location: string[];
  images: string[];
  startDate?: Date;
  endDate?: Date;
}

export function VehicleCard({
  id,
  name,
  type,
  pricePerHour,
  location,
  images,
  startDate,
  endDate
}: VehicleCardProps) {
  const router = useRouter();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const handleLocationChange = (location: string) => {
    setSelectedLocation(location);
  };

  const handleViewDetails = () => {
    const searchParams = new URLSearchParams();
    if (selectedLocation) {
      searchParams.set('location', selectedLocation);
    }
    if (startDate) {
      searchParams.set('startDate', startDate.toISOString());
    }
    if (endDate) {
      searchParams.set('endDate', endDate.toISOString());
    }

    const queryString = searchParams.toString();
    router.push(`/vehicles/${id}${queryString ? `?${queryString}` : ''}`);
  };

  return (
    <Card className="overflow-hidden">
      <div className="relative h-48 bg-gray-100">
        <Image
          src={images[0] || '/placeholder-vehicle.jpg'}
          alt={name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold">{name}</h3>
        <p className="text-sm text-gray-500 mb-2">{type}</p>
        
        <div className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-1">Price</p>
            <p className="text-lg font-semibold">₹{pricePerHour}/hour</p>
          </div>

          <div>
            <p className="text-sm font-medium mb-1">Location</p>
            <LocationDropdown
              locations={location}
              selectedLocation={selectedLocation}
              onLocationChange={handleLocationChange}
              vehicleId={id}
              startDate={startDate}
              endDate={endDate}
              className="w-full"
            />
          </div>

          <Button 
            onClick={handleViewDetails}
            className="w-full"
          >
            View Details
          </Button>
        </div>
      </div>
    </Card>
  );
} 