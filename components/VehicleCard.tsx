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
import { parseLocations } from '@/lib/utils/data-normalization';
import {
  DEFAULT_VEHICLE_IMAGE,
  getValidImageUrl,
  preloadImage,
  isValidDataUrl
} from '@/lib/utils/image-utils';
import { formatCurrency } from "@/lib/utils/currency";

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
  const locations = useMemo(() => {
    return parseLocations(vehicle.location);
  }, [vehicle.location]);

  const [selectedLocation, setSelectedLocation] = useState<string | null>(() => {
    const parsedLocations = parseLocations(vehicle.location);
    if (!parsedLocations || parsedLocations.length === 0) return null;

    // If we have an initial selected location that is valid, use it
    if (initialSelectedLocation && parsedLocations.includes(initialSelectedLocation)) {
      return initialSelectedLocation;
    }

    // CRITICAL: Force "Select pickup location" if multiple exist and no initial selection
    if (parsedLocations.length > 1) {
      return null;
    }

    return parsedLocations[0] || null;
  });

  // Keep selectedLocation in sync with prop changes
  useEffect(() => {
    const parsedLocations = parseLocations(vehicle.location);
    if (!parsedLocations || parsedLocations.length === 0) {
      setSelectedLocation(null);
      return;
    }

    // If we have an initial selected location that is valid, use it
    if (initialSelectedLocation && parsedLocations.includes(initialSelectedLocation)) {
      setSelectedLocation(initialSelectedLocation);
      return;
    }

    // If multiple locations exist and no valid selection, force user to pick
    if (parsedLocations.length > 1) {
      setSelectedLocation(null);
      return;
    }

    // Fallback to the first (and only) location
    setSelectedLocation(parsedLocations[0] || null);
  }, [vehicle.id, vehicle.location, initialSelectedLocation]);

  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageSource, setImageSource] = useState<string>(DEFAULT_VEHICLE_IMAGE);

  // Preload and validate image
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    setImageSource(DEFAULT_VEHICLE_IMAGE);

    const validateAndSetImage = () => {
      const source = getValidImageUrl(vehicle.images);

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
          setImageSource(source);
          setImageLoaded(true);
          setImageError(false);
        })
        .catch(() => {
          setImageError(true);
          setImageSource(DEFAULT_VEHICLE_IMAGE);
          setImageLoaded(true);
        });
    };

    validateAndSetImage();
  }, [vehicle.id, JSON.stringify(vehicle.images)]);

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
    const diffInHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    const isWeekend = isWeekendIST(start);
    const minimumHours = isWeekend ? 24 : 12;

    const result = calculateRentalPrice({
      price_per_hour: parseFloat(String(vehicle.price_per_hour)) || 0,
      price_7_days: vehicle.price_7_days ? parseFloat(String(vehicle.price_7_days)) : null,
      price_15_days: vehicle.price_15_days ? parseFloat(String(vehicle.price_15_days)) : null,
      price_30_days: vehicle.price_30_days ? parseFloat(String(vehicle.price_30_days)) : null
    }, diffInHours, isWeekend);

    const h = Math.floor(diffInHours);
    const m = Math.round((diffInHours - h) * 60);
    let durationStr = '';
    if (h === 0) durationStr = `${m} mins`;
    else if (m === 0) durationStr = `${h} hour${h === 1 ? '' : 's'}`;
    else durationStr = `${h} hr${h === 1 ? '' : 's'} ${m} mins`;

    return {
      totalAmount: result,
      duration: durationStr,
      isWeekend,
      actualHours: diffInHours,
      minimumHours
    };
  }, [pickupDateTime, dropoffDateTime, vehicle]);

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location);
    onLocationSelect?.(location);
  };

  const handleBookNow = () => {
    if (!selectedLocation) return;

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

  const formattedPickupDate = pickupDateTime ? new Date(pickupDateTime) : null;
  const formattedDropoffDate = dropoffDateTime ? new Date(dropoffDateTime) : null;

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

      {/* Unavailable Badge */}
      {vehicle.is_available === false && (
        <div className="absolute top-12 left-0 z-10 bg-red-50 rounded-r-full px-3 py-1 text-xs font-medium text-red-600 flex items-center gap-1 shadow-sm border border-red-100">
          Unavailable
        </div>
      )}

      {/* Vehicle Name */}
      <div className="pt-4 px-4 text-center mt-6">
        <h3 className="text-lg font-semibold text-gray-800 tracking-tight">{vehicle.name}</h3>
      </div>

      {/* Vehicle Image */}
      <div className="relative h-48 w-full my-4 bg-white flex items-center justify-center overflow-hidden">
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
            "object-contain mix-blend-multiply transition-opacity duration-300",
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

        <div className="space-y-1.5 mt-2">
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider text-center">Available at</p>
          <div className="w-full relative px-1">
            <LocationDropdown
              locations={locations}
              selectedLocation={selectedLocation}
              onLocationChange={handleLocationSelect}
              vehicleId={vehicle.id}
              className="w-full text-sm"
            />
          </div>
        </div>

        <div className="mt-auto pt-3 flex items-center justify-between gap-3 border-t border-dashed border-gray-200">
          <div className="flex-1">
            {children ? (
              <div className="[&>p:first-child]:text-lg [&>p:first-child]:font-bold [&>p:first-child]:text-gray-900 [&>p:last-child]:text-xs [&>p:last-child]:text-gray-500">
                {children}
              </div>
            ) : (
              <>
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(isNaN(priceDetails.totalAmount) ? 0 : priceDetails.totalAmount)}
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
              className={cn(
                "font-medium px-8 h-10 shadow-sm hover:shadow-md rounded-md transition-all duration-200",
                vehicle.is_available === false
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed hover:bg-gray-100"
                  : "bg-[#f26e24] hover:bg-[#e05d13] text-white"
              )}
              disabled={!selectedLocation || vehicle.is_available === false}
            >
              {vehicle.is_available === false ? 'Unavailable' : 'Book'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}