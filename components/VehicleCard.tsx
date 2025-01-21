import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
  // Convert time to 12-hour format
  const formatTime = (time: string) => {
    if (!time) return "";
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
      return `${hour12}:${minutes} ${ampm}`;
    } catch {
      return time;
    }
  };

  return (
    <div className={cn("bg-white rounded-lg shadow-md p-4 w-full max-w-sm", className)}>
      {/* Vehicle Name */}
      <h3 className="text-lg font-semibold mb-4">{name}</h3>

      {/* Vehicle Image */}
      <div className="relative w-full h-40 mb-4">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-contain"
          priority
        />
      </div>

      {/* Location Selector */}
      <div className="mb-4">
        <p className="text-sm text-gray-500 mb-1">Available at</p>
        <Select onValueChange={onLocationChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location} value={location}>
                {location}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Time Display */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-center">
          <p className="text-base font-medium">{formatTime(startTime)}</p>
          <p className="text-sm text-gray-500">{startDate}</p>
        </div>
        <div className="text-gray-400">to</div>
        <div className="text-center">
          <p className="text-base font-medium">{formatTime(endTime)}</p>
          <p className="text-sm text-gray-500">{endDate}</p>
        </div>
      </div>

      {/* Price and Book Button */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-lg font-semibold">₹ {price}</span>
        </div>
        <Button onClick={onBook} className="bg-orange-500 hover:bg-orange-600 text-white">
          Book
        </Button>
      </div>
    </div>
  );
} 