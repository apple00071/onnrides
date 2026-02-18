'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
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
  const [locationAvailability, setLocationAvailability] = useState<Record<string, boolean>>({});

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
      const hours = diffMs / (1000 * 60 * 60);

      setBookingHours(hours);
      setTotalPrice(hours * price);
    }
  }, [pickupDate, pickupTime, dropoffDate, dropoffTime, price]);

  // Check per-location availability for the selected time range
  useEffect(() => {
    // Require valid dates/times and at least one location
    if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime || formattedLocations.length === 0) {
      setLocationAvailability({});
      return;
    }

    let cancelled = false;

    const checkAvailability = async () => {
      const availability: Record<string, boolean> = {};

      for (const loc of formattedLocations) {
        try {
          const response = await fetch('/api/vehicles/check-availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vehicleId,
              location: loc,
              // Use ISO strings so this matches the timestamps used by /api/bookings
              startDate: new Date(`${pickupDate}T${pickupTime}`).toISOString(),
              endDate: new Date(`${dropoffDate}T${dropoffTime}`).toISOString(),
            }),
          });

          if (!response.ok) {
            logger.error('Failed to check availability for location', {
              vehicleId,
              location: loc,
              status: response.status,
            });
            // On error, treat as available to avoid blocking bookings unnecessarily
            availability[loc] = true;
            continue;
          }

          const data = await response.json();
          availability[loc] = !!data.available;
        } catch (error) {
          logger.error('Error checking availability for location', {
            vehicleId,
            location: loc,
            error,
          });
          // On network or other errors, default to available
          availability[loc] = true;
        }
      }

      if (cancelled) return;

      setLocationAvailability(availability);

      // Auto-select the first available location if current selection is unavailable
      setSelectedLocation((current) => {
        if (current && availability[current]) return current;
        const firstAvailable = formattedLocations.find((loc) => availability[loc]);
        return firstAvailable || '';
      });
    };

    checkAvailability();

    return () => {
      cancelled = true;
    };
  }, [vehicleId, formattedLocations, pickupDate, pickupTime, dropoffDate, dropoffTime]);

  const handleLocationChange = (value: string) => {
    setSelectedLocation(value);
  };

  const handleBooking = async () => {
    if (!selectedLocation) {
      toast.error('Please select a pickup location');
      return;
    }

    // Prevent booking from a location that is fully booked
    if (
      Object.keys(locationAvailability).length > 0 &&
      selectedLocation in locationAvailability &&
      !locationAvailability[selectedLocation]
    ) {
      toast.error('Selected location is not available for these dates. Please choose another location.');
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
                {formattedLocations.map((location) => {
                  const isAvailable = locationAvailability[location] ?? true;
                  return (
                    <SelectItem
                      key={location}
                      value={location}
                      disabled={!isAvailable}
                    >
                      <span className={isAvailable ? '' : 'text-gray-400'}>
                        {location}
                        {!isAvailable ? ' (Unavailable)' : ''}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <p className="text-sm text-gray-500">Duration</p>
              <p className="font-medium">{(() => {
                const h = Math.floor(bookingHours);
                const m = Math.round((bookingHours - h) * 60);
                if (h === 0) return `${m} mins`;
                if (m === 0) return `${h} hour${h === 1 ? '' : 's'}`;
                return `${h} hour${h === 1 ? '' : 's'} ${m} mins`;
              })()}</p>
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