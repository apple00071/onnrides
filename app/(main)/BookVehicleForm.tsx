'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';

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
    try {
      // Case 1: If locations is an array, clean each location
      if (Array.isArray(locations)) {
        return locations.map(loc => {
          // Clean the location string
          if (typeof loc === 'string') {
            // Remove brackets, quotes, and trim whitespace
            return loc.replace(/[\[\]"']/g, '').trim();
          }
          return String(loc).replace(/[\[\]"']/g, '').trim();
        }).filter(Boolean); // Remove any empty strings
      }
      
      // Case 2: If locations is a string
      if (typeof locations === 'string') {
        // Check if it's a JSON string (starts with [ and ends with ])
        if (locations.trim().startsWith('[') && locations.trim().endsWith(']')) {
          try {
            // Parse the JSON string into an array
            const parsedLocations = JSON.parse(locations);
            if (Array.isArray(parsedLocations)) {
              // Clean each location in the parsed array
              return parsedLocations.map(loc => {
                if (typeof loc === 'string') {
                  return loc.replace(/[\[\]"']/g, '').trim();
                }
                return String(loc).replace(/[\[\]"']/g, '').trim();
              }).filter(Boolean);
            }
          } catch (e) {
            // If JSON parsing fails, clean the string directly
            // Remove the surrounding brackets and split by comma
            const locationsWithoutBrackets = locations.replace(/^\[|\]$/g, '');
            return locationsWithoutBrackets.split(',')
              .map(loc => loc.replace(/[\[\]"']/g, '').trim())
              .filter(Boolean);
          }
        }
        
        // If it's just a single location string, clean and return it
        return [locations.replace(/[\[\]"']/g, '').trim()];
      }
      
      // Default case: Return empty array if locations is invalid
      return [];
    } catch (error) {
      logger.error('Error formatting locations:', error);
      return [];
    }
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