import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { LocationDropdown } from '@/components/location-dropdown';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import logger from '@/lib/logger';

interface VehicleCardProps {
  vehicle: {
    id: string;
    name: string;
    image_url: string;
    price_7_days: number;
    price_15_days: number;
    price_30_days: number;
    available_locations?: string[];
  };
  duration?: 7 | 15 | 30;
}

export function VehicleCard({ vehicle, duration = 7 }: VehicleCardProps) {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  const displayPrice = useMemo(() => {
    switch (duration) {
      case 7:
        return vehicle.price_7_days;
      case 15:
        return vehicle.price_15_days;
      case 30:
        return vehicle.price_30_days;
      default:
        return vehicle.price_7_days;
    }
  }, [vehicle, duration]);

  const handleBookNow = () => {
    if (!selectedLocation) {
      toast.error('Please select a location first');
      return;
    }
    router.push(`/vehicles/${vehicle.id}?location=${selectedLocation}`);
  };

  return (
    <div className="relative bg-white rounded-lg shadow-md overflow-hidden">
      <div className="relative h-48 w-full">
        <Image
          src={vehicle.image_url}
          alt={vehicle.name}
          fill
          className="object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{vehicle.name}</h3>
        <div className="flex flex-col gap-2">
          <div className="text-lg font-bold text-primary">
            Base Price: ₹{displayPrice}
            <span className="text-sm font-normal text-gray-500 block">
              + GST & Service Fee
            </span>
          </div>
          <LocationDropdown
            locations={vehicle.available_locations || []}
            selectedLocation={selectedLocation}
            onLocationChange={setSelectedLocation}
            vehicleId={vehicle.id}
          />
          <Button onClick={handleBookNow} className="w-full">
            Book Now
          </Button>
        </div>
      </div>
    </div>
  );
} 