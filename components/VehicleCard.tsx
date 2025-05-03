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
import {
  DEFAULT_VEHICLE_IMAGE,
  getValidImageUrl,
  preloadImage,
  isValidDataUrl
} from '@/lib/utils/image-utils';

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
  children?: React.ReactNode;
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
  children,
}: VehicleCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  
  // Parse and format locations
  const locations = Array.isArray(vehicle.location) ? vehicle.location : 
    typeof vehicle.location === 'string' ? JSON.parse(vehicle.location) : [];
  
  const [selectedLocation, setSelectedLocation] = useState<string | undefined>(
    initialSelectedLocation || (locations.length === 1 ? locations[0] : undefined)
  );
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSource, setImageSource] = useState<string>(DEFAULT_VEHICLE_IMAGE);

  // Preload and validate image on component mount
  useEffect(() => {
    const validateAndSetImage = () => {
      const source = getValidImageUrl(vehicle.images);
      logger.debug('Initial image source:', { source, vehicleId: vehicle.id });
      
      // If it's a data URL, we can use it directly
      if (isValidDataUrl(source)) {
        setImageSource(source);
        setImageLoaded(true);
        return;
      }
      
      // For regular URLs, preload the image
      preloadImage(source)
        .then(() => {
          setImageSource(source);
          setImageLoaded(true);
          setImageError(false);
        })
        .catch(() => {
          logger.warn('Failed to load image:', { 
            vehicleId: vehicle.id, 
            imageUrl: source 
          });
          setImageError(true);
          setImageSource(DEFAULT_VEHICLE_IMAGE);
          setImageLoaded(true);
        });
    };

    validateAndSetImage();
  }, [vehicle.id, vehicle.images]);

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
    
    // Add vehicle image if available
    if (imageSource && imageSource !== DEFAULT_VEHICLE_IMAGE) {
      // Only pass non-data URLs through URL params (data URLs are too large)
      if (!isValidDataUrl(imageSource)) {
        currentParams.set('vehicleImage', imageSource);
      }
    }
    
    // Calculate total price
    currentParams.set('totalPrice', priceDetails.totalAmount.toString());
    
    // Navigate to booking summary
    router.push(`/booking-summary?${currentParams.toString()}`);
  };

  // Handle image error
  const handleImageError = () => {
    logger.warn('Image failed to load:', { vehicleId: vehicle.id, images: vehicle.images });
    setImageError(true);
  };

  const handleImageLoaded = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  return (
    <div className={cn(
      "relative flex flex-col overflow-hidden rounded-lg border bg-white",
      selected && "ring-2 ring-primary",
      className
    )}>
      {/* Vehicle Name */}
      <h3 className="text-xl font-sans font-medium p-4">{vehicle.name}</h3>

      {/* Vehicle Image */}
      <div className="h-[200px] relative w-full bg-gray-100 flex items-center justify-center">
        <div className="relative w-[80%] h-[80%]">
          {/* Show loading spinner while image is loading */}
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
            </div>
          )}
          
          {/* Show error state if image fails to load */}
          {imageError && (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
          
          {/* Show image if available and loaded */}
          {!imageError && (
            <Image
              src={imageSource}
              alt={vehicle.name}
              fill
              className={cn(
                "object-contain",
                !imageLoaded && "opacity-0",
                imageLoaded && "opacity-100 transition-opacity duration-300"
              )}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority
              unoptimized={isValidDataUrl(imageSource)} // Disable optimization for data URLs
              onError={handleImageError}
              onLoad={handleImageLoaded}
            />
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

        {/* Location selector */}
        <div className="mb-4">
          <p className="text-sm text-gray-500 mb-2">Available at</p>
          {locations.length === 1 ? (
            <p className="text-sm font-medium">{locations[0]}</p>
          ) : (
            <Select
              value={selectedLocation}
              onValueChange={handleLocationSelect}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc: string) => (
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
            ₹{isNaN(priceDetails.totalAmount) ? 0 : priceDetails.totalAmount}
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