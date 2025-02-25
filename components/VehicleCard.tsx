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
import { format, parseISO } from "date-fns";
import { utcToZonedTime } from "date-fns-tz";
import { Vehicle } from "@/app/(main)/vehicles/types";

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

  // Local state for selected location
  const [selectedLocation, setSelectedLocation] = useState(initialSelectedLocation);

  // Update local state when prop changes
  useEffect(() => {
    setSelectedLocation(initialSelectedLocation);
  }, [initialSelectedLocation]);

  // Auto-select location if there's only one
  useEffect(() => {
    if (vehicle.location.length === 1 && !selectedLocation) {
      const location = vehicle.location[0];
      setSelectedLocation(location);
      if (onLocationSelect) {
        onLocationSelect(location);
      }
    }
  }, [vehicle.location, selectedLocation, onLocationSelect]);

  const handleLocationSelect = useCallback((location: string) => {
    // Update local state
    setSelectedLocation(location);

    // Call parent handler if provided
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  }, [onLocationSelect]);

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
      console.log('Setting 7-day price:', vehicle.price_7_days);
    }
    if (vehicle.price_15_days && vehicle.price_15_days > 0) {
      currentParams.set('price15Days', vehicle.price_15_days.toString());
      console.log('Setting 15-day price:', vehicle.price_15_days);
    }
    if (vehicle.price_30_days && vehicle.price_30_days > 0) {
      currentParams.set('price30Days', vehicle.price_30_days.toString());
      console.log('Setting 30-day price:', vehicle.price_30_days);
    }
    
    currentParams.set('vehicleImage', vehicle.images[0] || '/placeholder-vehicle.jpg');
    
    // Calculate the total price and add debug information
    const priceDetails = calculatePrice();
    const durationDays = priceDetails.totalHours / 24;
    
    console.log('Booking duration:', {
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
  const formatDateTime = (dateStr: string, timeStr: string) => {
    try {
      // Convert time from 24-hour format to ISO format
      const [hours, minutes] = timeStr.split(':');
      const formattedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}:00`;
      
      // Combine date and time
      const dateTimeStr = `${dateStr}T${formattedTime}`;
      
      // Parse the ISO date string
      const date = parseISO(dateTimeStr);
      const istDate = utcToZonedTime(date, timeZone);
      
      return {
        time: format(istDate, 'hh:mm a'),
        date: format(istDate, 'dd MMM yyyy')
      };
    } catch (error) {
      console.error('Error formatting date:', error);
      return {
        time: '',
        date: ''
      };
    }
  };

  // Calculate price based on duration and day of week
  const calculatePrice = () => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const pickupDate = searchParams.get('pickupDate');
      const pickupTime = searchParams.get('pickupTime');
      const dropoffDate = searchParams.get('dropoffDate');
      const dropoffTime = searchParams.get('dropoffTime');

      if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
        console.log('Missing date/time parameters');
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

      // Calculate minimum hours based on weekend/weekday
      const minHours = isWeekend ? 24 : vehicle.min_booking_hours || 4;
      const totalHours = Math.max(durationHours, minHours);

      console.log('Price calculation details:', {
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
          totalHours,
          durationDays: totalHours / 24,
          isWeekend
        }
      });

      // Calculate base amount using the utility function
      const baseAmount = calculateRentalPrice(vehicle, totalHours);
      const totalAmount = baseAmount;

      console.log('Final price:', {
        baseAmount,
        totalAmount,
        totalHours,
        durationHours,
        isWeekend
      });

      return {
        baseAmount,
        totalAmount,
        totalHours,
        durationHours,
        isWeekend
      };
    } catch (error) {
      console.error('Error calculating price:', error);
      return {
        baseAmount: vehicle.price_per_hour,
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
          pickup: formatDateTime(pickupDate, pickupTime),
          dropoff: formatDateTime(dropoffDate, dropoffTime)
        };
      }
      return null;
    } catch (error) {
      console.error('Error parsing dates:', error);
      return null;
    }
  };

  const dateTime = getDateTimeFromParams();

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
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
        {dateTime && (
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-gray-600">Pickup</p>
                <p>{dateTime.pickup.time}</p>
                <p>{dateTime.pickup.date}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600">Drop-off</p>
                <p>{dateTime.dropoff.time}</p>
                <p>{dateTime.dropoff.date}</p>
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
            // Multiple locations dropdown
            <Select value={selectedLocation} onValueChange={handleLocationSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {Array.isArray(vehicle.location) ? vehicle.location.map((loc) => (
                  <SelectItem key={loc} value={loc}>
                    {loc}
                  </SelectItem>
                )) : null}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Price and Book Section */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-lg text-gray-900 font-bold">
            {formatCurrency(priceDetails.totalHours > 0 ? priceDetails.totalAmount : priceDetails.baseAmount)}
          </div>
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