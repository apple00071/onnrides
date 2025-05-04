import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';

interface BookVehicleFormProps {
  vehicleId: string;
  locations: string[] | string;
  price: number; // Price per hour
}

export function BookVehicleForm({ vehicleId, locations, price }: BookVehicleFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [bookingHours, setBookingHours] = useState<number>(0);
  
  // Parse and clean location data to ensure proper display
  const formattedLocations = React.useMemo(() => {
    // Handle array of locations
    if (Array.isArray(locations)) {
      return locations.map(loc => {
        // If a location is a string with quotes, remove them
        if (typeof loc === 'string') {
          // Remove any surrounding quotes
          return loc.replace(/^["']+|["']+$/g, '').trim();
        }
        return String(loc).trim();
      }).filter(Boolean);
    } 
    
    // Handle string value (could be a JSON string or plain location)
    if (typeof locations === 'string') {
      // Empty string case
      if (!locations.trim()) return [];
      
      try {
        // Check if it's a JSON string array
        if (locations.trim().startsWith('[') && locations.trim().endsWith(']')) {
          const parsed = JSON.parse(locations);
          if (Array.isArray(parsed)) {
            return parsed.map(loc => {
              if (typeof loc === 'string') {
                // Remove any surrounding quotes
                return loc.replace(/^["']+|["']+$/g, '').trim();
              }
              return String(loc).trim();
            }).filter(Boolean);
          }
        }
        // Single location case - remove any quotes
        return [locations.trim().replace(/^["']+|["']+$/g, '')];
      } catch (e) {
        // If JSON parsing fails, treat as a single location
        return [locations.trim().replace(/^["']+|["']+$/g, '')];
      }
    }
    
    // Fallback for any other type
    return [];
  }, [locations]);
  
  // Get date and time parameters from URL
  const pickupDate = searchParams.get('pickupDate');
  const pickupTime = searchParams.get('pickupTime');
  const dropoffDate = searchParams.get('dropoffDate');
  const dropoffTime = searchParams.get('dropoffTime');
  
  // Calculate total booking hours and price
  useEffect(() => {
    if (pickupDate && pickupTime && dropoffDate && dropoffTime) {
      const pickup = new Date(`${pickupDate}T${pickupTime}`);
      const dropoff = new Date(`${dropoffDate}T${dropoffTime}`);
      
      const diffMs = dropoff.getTime() - pickup.getTime();
      const hours = Math.ceil(diffMs / (1000 * 60 * 60));
      
      setBookingHours(hours);
      setTotalPrice(hours * price);
    }
  }, [pickupDate, pickupTime, dropoffDate, dropoffTime, price]);
  
  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
  };
  
  const handleBooking = async () => {
    if (!selectedLocation) {
      toast.error('Please select a pickup location');
      return;
    }
    
    // Redirect to booking summary page
    router.push(`/booking-summary?vehicleId=${vehicleId}&location=${selectedLocation}&pickupDate=${pickupDate}&pickupTime=${pickupTime}&dropoffDate=${dropoffDate}&dropoffTime=${dropoffTime}`);
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Book Your Vehicle</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="location">Available at</Label>
            <Select value={selectedLocation} onValueChange={handleLocationChange}>
              <SelectTrigger id="location">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {formattedLocations.map((location) => (
                  <SelectItem key={location} value={location}>
                    {location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-medium">{bookingHours} hours</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Price Per Hour</p>
              <p className="font-medium">₹{price}</p>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Price:</span>
              <span className="text-xl font-bold text-primary">₹{totalPrice}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">*Excluding taxes and service charges</p>
          </div>
          
          <Button onClick={handleBooking} className="w-full">
            Proceed to Booking
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 