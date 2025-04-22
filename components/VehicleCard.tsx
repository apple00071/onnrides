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
import { cn } from "@/lib/utils";
import { calculateRentalPrice, isWeekendIST } from "@/lib/utils/price";
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

interface PriceDetails {
  totalAmount: number;
  duration: string;
}

interface FormattedDateTime {
  time: string;
  date: string;
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
  const pathname = usePathname();
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>(
    initialSelectedLocation || (vehicle.location.length === 1 ? vehicle.location[0] : undefined)
  );
  const [imageError, setImageError] = useState(false);

  // Format dates for display
  const formatDateTime = (dateStr: string): FormattedDateTime => {
    const date = new Date(dateStr);
    return {
      time: format(date, 'h:mm a'),
      date: format(date, 'MMM d, yyyy')
    };
  };

  const pickupFormatted = pickupDateTime ? formatDateTime(pickupDateTime) : null;
  const dropoffFormatted = dropoffDateTime ? formatDateTime(dropoffDateTime) : null;

  // Calculate price based on duration
  const calculatePrice = (): PriceDetails => {
    if (!pickupDateTime || !dropoffDateTime) {
      return {
        totalAmount: vehicle.price_per_hour,
        duration: '1 hour'
      };
    }

    const start = new Date(pickupDateTime);
    const end = new Date(dropoffDateTime);
    const durationInHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    
    const result = calculateRentalPrice({
      price_per_hour: vehicle.price_per_hour,
      price_7_days: vehicle.price_7_days,
      price_15_days: vehicle.price_15_days,
      price_30_days: vehicle.price_30_days
    }, durationInHours, isWeekendIST(start));

    return {
      totalAmount: result,
      duration: `${durationInHours} hours`
    };
  };

  const priceDetails = calculatePrice();

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    onLocationSelect?.(location);
  };

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
    }
    if (vehicle.price_15_days && vehicle.price_15_days > 0) {
      currentParams.set('price15Days', vehicle.price_15_days.toString());
    }
    if (vehicle.price_30_days && vehicle.price_30_days > 0) {
      currentParams.set('price30Days', vehicle.price_30_days.toString());
    }
    
    // Calculate total price
    currentParams.set('totalPrice', priceDetails.totalAmount.toString());
    
    // Navigate to booking summary
    router.push(`/booking-summary?${currentParams.toString()}`);
  };

  // Function to get a valid image URL
  const getValidImageUrl = (images: any): string => {
    logger.debug('Processing images:', { images, type: typeof images });

    // Handle undefined/null case
    if (!images) {
      logger.debug('No images provided');
      return '/images/placeholder-vehicle.png';
    }

    // If images is a string, try to parse it as JSON
    if (typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        images = parsed;
        logger.debug('Parsed JSON string:', { parsed });
      } catch (e) {
        // If parsing fails and it's a valid URL, use it directly
        if (images.trim() && (
          images.startsWith('http://') || 
          images.startsWith('https://') || 
          images.startsWith('/') || 
          images.startsWith('data:image/')
        )) {
          logger.debug('Using string as direct URL');
          return images;
        }
        logger.debug('Failed to parse JSON string and not a valid URL');
        return '/images/placeholder-vehicle.png';
      }
    }

    // Ensure images is an array
    if (!Array.isArray(images)) {
      logger.debug('Images is not an array:', { images });
      return '/images/placeholder-vehicle.png';
    }

    // Find first valid image URL
    const validImage = images.find(img => {
      if (!img || typeof img !== 'string') return false;
      const url = img.trim();
      return url.length > 0 && (
        url.startsWith('http://') || 
        url.startsWith('https://') || 
        url.startsWith('/') || 
        url.startsWith('data:image/')
      );
    });

    logger.debug('Found valid image:', { validImage });
    return validImage || '/images/placeholder-vehicle.png';
  };

  // Handle image error
  const handleImageError = () => {
    logger.warn('Image failed to load:', { vehicleId: vehicle.id, images: vehicle.images });
    setImageError(true);
  };

  return (
    <div className={cn(
      "bg-white rounded-lg shadow-sm overflow-hidden group",
      className,
      selected && "ring-2 ring-orange-500"
    )}>
      {/* Vehicle Name */}
      <h3 className="text-xl font-sans font-medium p-4">{vehicle.name}</h3>

      {/* Vehicle Image */}
      <div className="h-[200px] relative w-full bg-gray-100 flex items-center justify-center">
        <div className="relative w-[80%] h-[80%]">
          {!imageError ? (
            <Image
              src={getValidImageUrl(vehicle.images)}
              alt={vehicle.name}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4">
        {/* Display formatted dates */}
        {pickupDateTime && dropoffDateTime && (
          <div className="mb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <div>
                <p className="text-gray-600">Pickup</p>
                <p>{pickupFormatted?.time}</p>
                <p>{pickupFormatted?.date}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-600">Drop-off</p>
                <p>{dropoffFormatted?.time}</p>
                <p>{dropoffFormatted?.date}</p>
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
            // Multiple locations dropdown - Updated styling
            <Select 
              value={selectedLocation} 
              onValueChange={handleLocationSelect}
            >
              <SelectTrigger className="w-full bg-white border-gray-300 focus:ring-primary focus:ring-opacity-50 focus:border-primary focus:ring-0 focus:outline-none">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-gray-200 shadow-md">
                {vehicle.location.map((loc) => (
                  <SelectItem key={loc} value={loc} className="hover:bg-gray-100">
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