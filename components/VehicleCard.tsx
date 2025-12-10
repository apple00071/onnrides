import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { LocationDropdown } from '@/components/location-dropdown';
import { cn } from "@/lib/utils";
import { calculateRentalPrice, isWeekendIST } from "@/lib/utils/price";
import { useEffect, useCallback, useState, useMemo } from "react";
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
  showBookingButton = true,
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

  const [selectedLocation, setSelectedLocation] = useState<string | null>(
    initialSelectedLocation || (locations.length === 1 ? locations[0] : null)
  );
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSource, setImageSource] = useState<string>(DEFAULT_VEHICLE_IMAGE);

  // Preload and validate image
  useEffect(() => {
    logger.info('VehicleCard image useEffect triggered', {
      vehicleId: vehicle.id,
      vehicleName: vehicle.name,
      images: vehicle.images,
      imageCount: vehicle.images?.length || 0
    });

    // Reset states when vehicle changes
    setImageLoaded(false);
    setImageError(false);
    setImageSource(DEFAULT_VEHICLE_IMAGE);

    const validateAndSetImage = () => {
      const source = getValidImageUrl(vehicle.images);

      logger.info('Image URL extracted', {
        vehicleId: vehicle.id,
        source,
        isDataUrl: isValidDataUrl(source),
        isDefault: source === DEFAULT_VEHICLE_IMAGE
      });

      if (isValidDataUrl(source)) {
        setImageSource(source);
        setImageLoaded(true);
        return;
      }

      if (source === DEFAULT_VEHICLE_IMAGE) {
        setImageSource(DEFAULT_VEHICLE_IMAGE);
        setImageLoaded(true);
        return;
      }

      preloadImage(source)
        .then(() => {
          logger.info('Image loaded successfully', { vehicleId: vehicle.id, source });
          setImageSource(source);
          setImageLoaded(true);
          setImageError(false);
        })
        .catch((err) => {
          logger.error('Image failed to load', { vehicleId: vehicle.id, source, error: err.message });
          setImageError(true);
          setImageSource(DEFAULT_VEHICLE_IMAGE);
          setImageLoaded(true);
        });
    };

    validateAndSetImage();
  }, [vehicle.id, JSON.stringify(vehicle.images)]);

  // Format dates for display
  const formattedPickupDate = pickupDateTime ? new Date(pickupDateTime) : null;
  const formattedDropoffDate = dropoffDateTime ? new Date(dropoffDateTime) : null;

  // Calculate price based on duration
  const priceDetails = useMemo(() => {
    if (!pickupDateTime || !dropoffDateTime) {
      return {
        totalAmount: vehicle.price_per_hour,
        duration: '1 hour',
        isWeekend: false,
        actualHours: 1,
        minimumHours: 12
      };
    }

    const start = new Date(pickupDateTime);
    const end = new Date(dropoffDateTime);
    const durationInHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    const isWeekend = isWeekendIST(start);
    const minimumHours = isWeekend ? 24 : 12;

    const result = calculateRentalPrice({
      price_per_hour: vehicle.price_per_hour,
      price_7_days: vehicle.price_7_days,
      price_15_days: vehicle.price_15_days,
      price_30_days: vehicle.price_30_days
    }, durationInHours, isWeekend);

    return {
      totalAmount: result,
      duration: `${durationInHours} hours`,
      isWeekend,
      actualHours: durationInHours,
      minimumHours
    };
  }, [pickupDateTime, dropoffDateTime, vehicle]);

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    onLocationSelect?.(location);
  };

  const handleBookNow = () => {
    if (!selectedLocation) {
      return;
    }
    const currentParams = new URLSearchParams(searchParams?.toString() || '');
    currentParams.set('location', selectedLocation);

    // Pass existing params
    const params = new URLSearchParams(window.location.search);
    ['pickupDate', 'pickupTime', 'dropoffDate', 'dropoffTime'].forEach(key => {
      const val = params.get(key);
      if (val) currentParams.set(key, val);
    });

    currentParams.set('vehicleId', vehicle.id);
    currentParams.set('vehicleName', vehicle.name);
    currentParams.set('pricePerHour', vehicle.price_per_hour.toString());

    if ((vehicle.price_7_days ?? 0) > 0) currentParams.set('price7Days', (vehicle.price_7_days ?? 0).toString());
    if ((vehicle.price_15_days ?? 0) > 0) currentParams.set('price15Days', (vehicle.price_15_days ?? 0).toString());
    if ((vehicle.price_30_days ?? 0) > 0) currentParams.set('price30Days', (vehicle.price_30_days ?? 0).toString());

    if (imageSource && imageSource !== DEFAULT_VEHICLE_IMAGE && !isValidDataUrl(imageSource)) {
      currentParams.set('vehicleImage', imageSource);
    }

    currentParams.set('totalPrice', priceDetails.totalAmount.toString());
    router.push(`/booking-summary?${currentParams.toString()}`);
  };

  return (
    <div className={cn(
      "group relative bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full",
      selected && "ring-2 ring-primary",
      className
    )}>
      {/* Zero Deposit Badge */}
      <div className="absolute top-4 left-0 z-10 bg-[#fff9e6] rounded-r-full px-3 py-1 text-xs font-medium text-orange-500 flex items-center gap-1 shadow-sm border border-orange-100">
        <span>🔥</span> Zero deposit
      </div>

      {/* Vehicle Name */}
      <div className="pt-4 px-4 text-center mt-6">
        <h3 className="text-lg font-semibold text-gray-800 tracking-tight">{vehicle.name}</h3>
      </div>

      {/* Vehicle Image */}
      {/* Vehicle Image */}
      {/* Vehicle Image */}
      <div className="relative h-48 w-full my-4 bg-white flex items-center justify-center overflow-hidden">
        {/* Show loading spinner while image is loading */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        )}

        <Image
          src={imageSource}
          alt={vehicle.name}
          fill
          className={cn(
            "object-contain mix-blend-multiply",
            !imageLoaded && "opacity-0",
            imageLoaded && "opacity-100"
          )}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority
          unoptimized={isValidDataUrl(imageSource)}
          onError={() => setImageError(true)}
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      <div className="px-4 pb-4 flex-grow flex flex-col gap-3">
        {/* Display formatted dates */}
        {(formattedPickupDate && formattedDropoffDate) ? (
          <div className="flex justify-between items-center text-xs text-gray-600 border-t border-b border-gray-50 py-2">
            <div className="text-left">
              <p className="font-semibold text-gray-800">{format(formattedPickupDate, 'h:mm a')}</p>
              <p>{format(formattedPickupDate, 'MMM d, yyyy')}</p>
            </div>
            <div className="bg-gray-800 text-white rounded-full px-2 py-0.5 text-[10px]">TO</div>
            <div className="text-right">
              <p className="font-semibold text-gray-800">{format(formattedDropoffDate, 'h:mm a')}</p>
              <p>{format(formattedDropoffDate, 'MMM d, yyyy')}</p>
            </div>
          </div>
        ) : null}

        {/* Location selector */}
        <div className="space-y-1">
          <p className="text-xs text-gray-500 text-center">Available at</p>
          <div className="w-full">
            <LocationDropdown
              locations={locations}
              selectedLocation={selectedLocation}
              onLocationChange={handleLocationSelect}
              vehicleId={vehicle.id}
              className="w-full text-sm h-9"
            />
          </div>
        </div>

        {/* Price and Book Section */}
        <div className="mt-auto pt-3 flex items-center justify-between gap-3 border-t border-dashed border-gray-200">
          <div className="flex-1">
            {children ? (
              <div className="[&>p:first-child]:text-lg [&>p:first-child]:font-bold [&>p:first-child]:text-gray-900 [&>p:last-child]:text-xs [&>p:last-child]:text-gray-500">
                {children}
              </div>
            ) : (
              <>
                <div className="text-lg font-bold text-gray-900">
                  ₹{isNaN(priceDetails.totalAmount) ? 0 : priceDetails.totalAmount}
                </div>
                {pickupDateTime && dropoffDateTime && priceDetails.actualHours < priceDetails.minimumHours && (
                  <p className="text-[10px] text-orange-600 mt-0.5">
                    {priceDetails.isWeekend ? '24hrs minimum (weekend)' : '12hrs minimum (weekday)'}
                  </p>
                )}
              </>
            )}
          </div>

          {showBookingButton && (
            <Button
              onClick={handleBookNow}
              className="bg-[#f26e24] hover:bg-[#e05d13] text-white font-medium px-8 h-10 shadow-sm hover:shadow-md rounded-md transition-all duration-200"
              disabled={!selectedLocation}
            >
              Book
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 