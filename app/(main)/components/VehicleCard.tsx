import { useState, useEffect } from 'react';
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
import { LocationDropdown } from "@/components/location-dropdown";
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';

interface VehicleCardProps {
  vehicle: {
    id: string;
    name: string;
    type: string;
    price_per_hour: number;
    location: string[];
    images: string[];
    quantity: number;
    min_booking_hours: number;
    is_available?: boolean;
    available?: boolean;
    nextAvailable?: {
      nextAvailable: string;
      until: string | null;
    } | null;
  };
  selectedLocation?: string;
  onLocationSelect: (location: string) => void;
  pickupDateTime?: string;
  dropoffDateTime?: string;
  duration?: string;
}

export function VehicleCard({ 
  vehicle, 
  selectedLocation, 
  onLocationSelect,
  pickupDateTime,
  dropoffDateTime 
}: VehicleCardProps) {
  const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
  const [previousVehicleType, setPreviousVehicleType] = useState(vehicle.type);
  const router = useRouter();

  const isAvailable = vehicle.is_available ?? vehicle.available ?? true;

  const handleBookNow = async () => {
    if (!selectedLocation) {
      return;
    }

    try {
      // Check availability before proceeding
      const response = await fetch(`/api/vehicles/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          location: selectedLocation,
          startDate: pickupDateTime,
          endDate: dropoffDateTime
        })
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.message || 'Failed to check availability');
        return;
      }

      const { available } = await response.json();
      
      if (!available) {
        toast.error('This vehicle is not available at the selected location for the chosen time period');
        return;
      }

      // If available, proceed to booking summary
      const queryParams = new URLSearchParams();
      queryParams.set('location', selectedLocation);
      
      if (pickupDateTime) {
        const pickup = new Date(pickupDateTime);
        queryParams.set('pickupDate', pickup.toISOString().split('T')[0]);
        queryParams.set('pickupTime', pickup.toISOString().split('T')[1].split('.')[0]);
      }
      
      if (dropoffDateTime) {
        const dropoff = new Date(dropoffDateTime);
        queryParams.set('dropoffDate', dropoff.toISOString().split('T')[0]);
        queryParams.set('dropoffTime', dropoff.toISOString().split('T')[1].split('.')[0]);
      }
      
      queryParams.set('vehicleId', vehicle.id);
      queryParams.set('type', vehicle.type);
      queryParams.set('pricePerHour', vehicle.price_per_hour.toString());
      router.push(`/booking-summary?${queryParams.toString()}`);
    } catch (error) {
      logger.error('Error checking availability:', error);
      toast.error('Failed to check vehicle availability');
    }
  };

  const handleLocationSelect = (location: string) => {
    logger.info('Location manually selected:', {
      vehicleId: vehicle.id,
      vehicleType: vehicle.type,
      location,
      previousLocation: selectedLocation,
      isUserInitiated: true
    });
    onLocationSelect(location);
  };

  // Reset location when vehicle type changes
  useEffect(() => {
    if (vehicle.type !== previousVehicleType && previousVehicleType) {
      logger.info('Vehicle type changed, resetting location:', {
        previousType: previousVehicleType,
        newType: vehicle.type
      });
      onLocationSelect('');
      setPreviousVehicleType(vehicle.type);
    }
  }, [vehicle.type, previousVehicleType, onLocationSelect]);

  const handleBookForAvailableTime = () => {
    if (vehicle.nextAvailable) {
      const nextAvailableTime = new Date(vehicle.nextAvailable.nextAvailable);
      router.push(`/book/${vehicle.id}?location=${selectedLocation}&pickupDateTime=${nextAvailableTime.toISOString()}`);
    }
    setShowAvailabilityDialog(false);
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="p-6">
        <div className="flex flex-col space-y-1.5">
          <h3 className="text-xl font-sans font-medium">
            {vehicle.name}
          </h3>
        </div>
      </div>
      <div className="h-[200px] relative w-full bg-gray-100 flex items-center justify-center">
        <div className="relative w-[80%] h-[80%]">
          <Image
            src={vehicle.images[0] || '/placeholder-vehicle.jpg'}
            alt={vehicle.name}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
        </div>
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-semibold">
              ₹{vehicle.price_per_hour}/hr
            </p>
            <p className="text-sm text-muted-foreground">
              Min. {vehicle.min_booking_hours} hours
            </p>
          </div>
          <LocationDropdown
            locations={vehicle.location}
            selectedLocation={selectedLocation || null}
            onLocationChange={handleLocationSelect}
            vehicleId={vehicle.id}
            startDate={pickupDateTime ? new Date(pickupDateTime) : undefined}
            endDate={dropoffDateTime ? new Date(dropoffDateTime) : undefined}
            className="w-[180px]"
            vehicleType={vehicle.type}
          />
        </div>
        <Button
          className="w-full mt-4"
          onClick={handleBookNow}
          disabled={!selectedLocation || !isAvailable}
        >
          {!selectedLocation ? 'Select Location' : !isAvailable ? 'Not Available' : 'Book Now'}
        </Button>
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
    </div>
  );
} 