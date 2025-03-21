import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCurrency } from "@/lib/utils";
import { calculateRentalPrice } from "@/lib/utils/price";
import { useEffect, useCallback, useState } from "react";
import { format } from "date-fns";
import { toIST, formatDateTimeIST, formatDateIST, formatTimeIST } from "@/lib/utils/timezone";
import { Vehicle } from "@/app/(main)/vehicles/types";
import logger from '@/lib/logger';

interface VehicleCardProps {
  vehicle: Vehicle;
  selectedLocation?: string;
  onLocationSelect?: (location: string) => void;
  pickupDateTime?: string;
  dropoffDateTime?: string;
  className?: string;
  showBookingButton?: boolean;
  onSelect?: (vehicle: Vehicle) => void;
  selected?: boolean;
}

export function VehicleCard({
  vehicle,
  selectedLocation: initialSelectedLocation,
  onLocationSelect,
  pickupDateTime,
  dropoffDateTime,
  className,
  showBookingButton,
  onSelect,
  selected,
}: VehicleCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const timeZone = 'Asia/Kolkata'; // UTC+5:30

  // Local state for selected location - independent for each card
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>(
    vehicle.location.length === 1 ? vehicle.location[0] : undefined
  );

  const handleLocationSelect = useCallback((location: string) => {
    setSelectedLocation(location);
  }, []);

  // Remove the effect that syncs with parent location
  useEffect(() => {
    if (vehicle.location.length === 1) {
      setSelectedLocation(vehicle.location[0]);
    }
  }, [vehicle.location]);

  const handleBookNow = () => {
    if (!selectedLocation) {
      return;
    }

    // Get current search params
    const currentParams = new URLSearchParams(searchParams.toString());
    
    // Update location in params
    currentParams.set('location', selectedLocation);
    
    // Add pickup and dropoff dates and times if available
    const params = new URLSearchParams(window.location.search);
    const pickupDate = params.get('pickupDate');
    const pickupTime = params.get('pickupTime');
    const dropoffDate = params.get('dropoffDate');
    const dropoffTime = params.get('dropoffTime');

    // Add all necessary parameters for booking summary
    if (pickupDate) currentParams.set('pickupDate', pickupDate);
    if (pickupTime) currentParams.set('pickupTime', pickupTime);
    if (dropoffDate) currentParams.set('dropoffDate', dropoffDate);
    if (dropoffTime) currentParams.set('dropoffTime', dropoffTime);
    currentParams.set('vehicleId', vehicle.id);
    currentParams.set('vehicleName', vehicle.name);
    currentParams.set('pricePerHour', vehicle.price_per_hour.toString());
    
    // Add special pricing if available (ensure values are greater than 0)
    if (vehicle.price_7_days && vehicle.price_7_days > 0) {
      currentParams.set('price7Days', vehicle.price_7_days.toString());
      logger.debug('Setting 7-day price:', vehicle.price_7_days);
    }
    if (vehicle.price_15_days && vehicle.price_15_days > 0) {
      currentParams.set('price15Days', vehicle.price_15_days.toString());
      logger.debug('Setting 15-day price:', vehicle.price_15_days);
    }
    if (vehicle.price_30_days && vehicle.price_30_days > 0) {
      currentParams.set('price30Days', vehicle.price_30_days.toString());
      logger.debug('Setting 30-day price:', vehicle.price_30_days);
    }
    
    currentParams.set('vehicleImage', vehicle.images[0] || '/placeholder-vehicle.jpg');
    
    // Calculate the total price and add debug information
    const priceDetails = calculatePrice();
    const durationDays = priceDetails.totalHours / 24;
    
    logger.debug('Booking duration:', {
      totalHours: priceDetails.totalHours,
      durationDays,
      price: priceDetails.totalAmount,
      specialPricing: {
        has7DayPrice: Boolean(vehicle.price_7_days),
        has15DayPrice: Boolean(vehicle.price_15_days),
        has30DayPrice: Boolean(vehicle.price_30_days)
      }
    });
    
    currentParams.set('totalAmount', priceDetails.totalAmount.toString());
    
    // Redirect directly to booking summary page
    router.push(`/booking-summary?${currentParams.toString()}`);
  };

  // Format date and time in IST
  const formatDateTime = (dateTimeStr: string) => {
    try {
      // Parse and convert to IST
      const date = new Date(dateTimeStr);
      if (!isNaN(date.getTime())) {
        return {
          time: formatTimeIST(date),
          date: formatDateIST(date)
        };
      }
      return {
        time: '',
        date: ''
      };
    } catch (error) {
      logger.error('Error formatting date:', error);
      return {
        time: '',
        date: ''
      };
    }
  };

  // Get formatted pickup and dropoff times
  const pickupFormatted = pickupDateTime ? formatDateTime(pickupDateTime) : { date: '', time: '' };
  const dropoffFormatted = dropoffDateTime ? formatDateTime(dropoffDateTime) : { date: '', time: '' };

  // Calculate price based on duration and day of week
  const calculatePrice = () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const pickupDate = searchParams.get('pickupDate');
      const pickupTime = searchParams.get('pickupTime');
      const dropoffDate = searchParams.get('dropoffDate');
      const dropoffTime = searchParams.get('dropoffTime');

      if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
        logger.debug('Missing date/time parameters');
        return {
          baseAmount: vehicle.price_per_hour,
          totalAmount: vehicle.price_per_hour,
          totalHours: 1,
          durationHours: 1,
          isWeekend: false
        };
      }

      const pickup = new Date(`${pickupDate}T${pickupTime}`);
      const dropoff = new Date(`${dropoffDate}T${dropoffTime}`);
      const durationHours = Math.ceil((dropoff.getTime() - pickup.getTime()) / (1000 * 60 * 60));
      const isWeekend = pickup.getDay() === 0 || pickup.getDay() === 6;

      logger.debug('Price calculation details:', {
        vehicle: {
          name: vehicle.name,
          price_per_hour: vehicle.price_per_hour,
          price_7_days: vehicle.price_7_days,
          price_15_days: vehicle.price_15_days,
          price_30_days: vehicle.price_30_days
        },
        duration: {
          pickup: pickup.toISOString(),
          dropoff: dropoff.toISOString(),
          durationHours,
          isWeekend
        }
      });

      // Calculate total amount using the utility function with weekend/weekday logic
      const totalAmount = calculateRentalPrice(vehicle, durationHours, isWeekend);
      
      // Calculate display hours based on weekend/weekday minimum
      const displayHours = isWeekend ? 
        Math.max(24, durationHours) : // Weekend minimum 24 hours
        durationHours <= 12 ? 12 : durationHours; // Weekday minimum 12 hours

      logger.debug('Final price:', {
        totalAmount,
        displayHours,
        durationHours,
        isWeekend
      });

      return {
        totalAmount,
        totalHours: displayHours,
        durationHours,
        isWeekend
      };
    } catch (error) {
      logger.error('Error calculating price:', error);
      return {
        totalAmount: vehicle.price_per_hour,
        totalHours: 1,
        durationHours: 1,
        isWeekend: false
      };
    }
  };

  const priceDetails = calculatePrice();

  // Parse dates from URL format
  const getDateTimeFromParams = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const pickupDate = params.get('pickupDate');
      const pickupTime = params.get('pickupTime');
      const dropoffDate = params.get('dropoffDate');
      const dropoffTime = params.get('dropoffTime');

      if (pickupDate && pickupTime && dropoffDate && dropoffTime) {
        return {
          pickup: formatDateTime(pickupDate + 'T' + pickupTime),
          dropoff: formatDateTime(dropoffDate + 'T' + dropoffTime)
        };
      }
      return null;
    } catch (error) {
      logger.error('Error parsing dates:', error);
      return null;
    }
  };

  const dateTime = getDateTimeFromParams();

  return (
    <div className={cn(
      "bg-white rounded-lg shadow-sm overflow-hidden group",
      className,
      selected && "ring-2 ring-orange-500"
    )}>
      {/* Vehicle Name */}
      <h3 className="text-xl font-sans font-medium p-4">{vehicle.name}</h3>

      {/* Vehicle Image */}
      <div className="relative h-48">
        <Image
          src={vehicle.images[0] || '/placeholder-vehicle.jpg'}
          alt={vehicle.name}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority
        />
      </div>

      <div className="p-4">
        {/* Display formatted dates */}
        {pickupDateTime && dropoffDateTime && (
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-gray-600">Pickup</p>
                <p>{pickupFormatted.time}</p>
                <p>{pickupFormatted.date}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600">Drop-off</p>
                <p>{dropoffFormatted.time}</p>
                <p>{dropoffFormatted.date}</p>
              </div>
            </div>
          </div>
        )}

        {/* Available at Section */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-1">Available at</p>
          {vehicle.location.length === 1 ? (
            // Single location display
            <div className="w-full p-2 border border-gray-300 rounded-md bg-white">
              {vehicle.location[0]}
            </div>
          ) : (
            // Multiple locations dropdown - independent for each card
            <Select 
              value={selectedLocation} 
              onValueChange={handleLocationSelect}
            >
              <SelectTrigger>
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
          )}
        </div>

        {/* Price and Book Section */}
        <div className="flex items-center justify-between">
          <p className="text-2xl font-semibold">
            ₹{priceDetails.totalAmount}
          </p>
          <Button
            onClick={handleBookNow}
            className="bg-[#f26e24] hover:bg-[#e05d13] text-white px-8"
            disabled={!selectedLocation}
          >
            Book
          </Button>
        </div>
      </div>
    </div>
  );
} 