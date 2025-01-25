import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "react-hot-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn, formatCurrency } from "@/lib/utils";

interface VehicleCardProps {
  name: string;
  imageUrl: string;
  locations: string[];
  price: number;
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
  onLocationChange: (location: string) => void;
  onBook: () => void;
  className?: string;
}

export function VehicleCard({
  name,
  imageUrl,
  locations,
  price,
  startTime,
  endTime,
  startDate,
  endDate,
  onLocationChange,
  onBook,
  className,
}: VehicleCardProps) {
  // Parse and clean locations
  const parsedLocations = (() => {
    if (!locations || locations.length === 0) return [];
    
    return locations.map(location => {
      // If the location is a JSON string (e.g., from database)
      if (typeof location === 'string') {
        try {
          // Try to parse if it's a JSON string
          const parsed = JSON.parse(location);
          return Array.isArray(parsed) ? parsed[0] : location.replace(/[\[\]'"]/g, '').trim();
        } catch (e) {
          // If parsing fails, just clean the string
          return location.replace(/[\[\]'"]/g, '').trim();
        }
      }
      return location;
    }).filter(Boolean); // Remove any empty values
  })();

  const handleBookClick = () => {
    if (!parsedLocations || parsedLocations.length === 0) {
      toast.error('Please select a location to proceed');
      return;
    }
    onBook();
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    });
  };

  const formatDate = (date: string) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition-shadow",
        className
      )}
    >
      {/* Vehicle Image */}
      <div className="relative h-48 flex items-center justify-center bg-gray-100">
        <div className="relative h-40 w-64">
          <Image
            src={imageUrl || '/placeholder.png'}
            alt={name}
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
        </div>
      </div>

      <div className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">{name}</h3>
            <div>
              <p className="text-sm text-gray-500 mb-1">Available at</p>
              <Select
                value={parsedLocations[0] || ''}
                onValueChange={onLocationChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {parsedLocations.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">
                {formatCurrency(price)}
              </div>
            </div>
          </div>
        </div>

        {/* Date Time Display */}
        {startTime && endTime && startDate && endDate && (
          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <p className="text-base font-medium">{formatTime(startTime)}</p>
              <p className="text-sm text-gray-500">{formatDate(startDate)}</p>
            </div>
            <div className="text-gray-400">to</div>
            <div className="text-center">
              <p className="text-base font-medium">{formatTime(endTime)}</p>
              <p className="text-sm text-gray-500">{formatDate(endDate)}</p>
            </div>
          </div>
        )}

        <Button
          onClick={handleBookClick}
          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
        >
          Book Now
        </Button>
      </div>
    </div>
  );
} 