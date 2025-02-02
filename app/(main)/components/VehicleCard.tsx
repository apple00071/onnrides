import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDateTime } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VehicleCardProps {
  vehicle: {
    id: string;
    name: string;
    type: string;
    price_per_hour: number;
    location: string[];
    images: string[];
    available: boolean;
    nextAvailable?: {
      nextAvailable: string;
      until: string | null;
    } | null;
  };
  selectedLocation?: string;
  onLocationSelect?: (location: string) => void;
  pickupDateTime?: string;
  dropoffDateTime?: string;
}

export function VehicleCard({ 
  vehicle, 
  selectedLocation, 
  onLocationSelect,
  pickupDateTime,
  dropoffDateTime 
}: VehicleCardProps) {
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const router = useRouter();

  const handleBookNow = () => {
    if (!selectedLocation) {
      return;
    }

    if (!vehicle.available) {
      setShowAvailabilityDialog(true);
    } else {
      const queryParams = new URLSearchParams();
      queryParams.set('location', selectedLocation);
      if (pickupDateTime) queryParams.set('pickupDateTime', pickupDateTime);
      if (dropoffDateTime) queryParams.set('dropoffDateTime', dropoffDateTime);
      
      router.push(`/book/${vehicle.id}?${queryParams.toString()}`);
    }
  };

  const handleLocationSelect = (location: string) => {
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  };

  const handleBookForAvailableTime = () => {
    if (vehicle.nextAvailable) {
      const nextAvailableTime = new Date(vehicle.nextAvailable.nextAvailable);
      router.push(`/book/${vehicle.id}?location=${selectedLocation}&pickupDateTime=${nextAvailableTime.toISOString()}`);
    }
    setShowAvailabilityDialog(false);
  };

  return (
    <>
      <div className="relative bg-white rounded-lg shadow-md overflow-hidden">
        <div className="relative h-48 w-full">
          <Image
            src={vehicle.images[0] || '/placeholder-vehicle.jpg'}
            alt={vehicle.name}
            fill
            className="object-cover"
          />
        </div>
        <div className="p-4">
          <h3 className="text-lg font-semibold">{vehicle.name}</h3>
          <p className="text-gray-600">{vehicle.type}</p>
          <p className="text-primary font-bold mt-2">₹{vehicle.price_per_hour}/hour</p>
          
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-1">Available at</p>
            <Select value={selectedLocation} onValueChange={handleLocationSelect}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {vehicle.location.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedLocation && (
              <p className={`text-sm ${vehicle.available ? 'text-green-600' : 'text-orange-600'} mt-2`}>
                {vehicle.available ? 'Available Now' : 'Currently Unavailable'}
              </p>
            )}
          </div>

          <Button
            onClick={handleBookNow}
            className="w-full mt-4"
            variant={!selectedLocation ? 'outline' : vehicle.available ? 'default' : 'secondary'}
            disabled={!selectedLocation}
          >
            {!selectedLocation 
              ? 'Select Location' 
              : vehicle.available 
                ? 'Book Now' 
                : 'Check Next Available'
            }
          </Button>
        </div>
      </div>

      {/* Availability Dialog */}
      <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Next Available Time Slot</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {vehicle.nextAvailable ? (
              <>
                <p className="text-gray-600">
                  This vehicle will be available from:
                  <br />
                  <span className="font-semibold">
                    {formatDateTime(vehicle.nextAvailable.nextAvailable)}
                  </span>
                  {vehicle.nextAvailable.until && (
                    <>
                      <br />
                      until
                      <br />
                      <span className="font-semibold">
                        {formatDateTime(vehicle.nextAvailable.until)}
                      </span>
                    </>
                  )}
                </p>
                <Button
                  onClick={handleBookForAvailableTime}
                  className="w-full mt-4"
                >
                  Book for Available Time
                </Button>
              </>
            ) : (
              <p className="text-gray-600">
                No upcoming availability information found. Please try again later.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
} 