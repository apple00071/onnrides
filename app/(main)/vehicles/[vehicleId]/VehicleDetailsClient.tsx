'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Vehicle } from '@/lib/schema';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { CalendarIcon, MapPin, Clock, IndianRupee, Car } from 'lucide-react';
import Image from 'next/image';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Props {
  params: {
    vehicleId: string;
  };
}

export default function VehicleDetailsClient({ params }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
  const [dropoffDate, setDropoffDate] = useState<Date | undefined>(new Date());
  const [pickupTime, setPickupTime] = useState<string>('');
  const [dropoffTime, setDropoffTime] = useState<string>('');

  // Generate time options logic (matches HeroSection)
  const getTimeOptions = (isPickup: boolean) => {
    const now = new Date();
    const istTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    const selectedDate = isPickup ? pickupDate : dropoffDate;
    if (!selectedDate) return [];

    const todayIST = new Date(istTime);
    todayIST.setHours(0, 0, 0, 0);
    const compareDate = new Date(selectedDate);
    compareDate.setHours(0, 0, 0, 0);

    const isToday = compareDate.getTime() === todayIST.getTime();

    let startHour = 0;
    let startMinute = 0;
    if (isToday) {
      const currentHour = istTime.getHours();
      const currentMinutes = istTime.getMinutes();
      const totalMinutes = (currentHour * 60) + currentMinutes;
      const nextSlotInMinutes = (Math.floor(totalMinutes / 30) + 1) * 30;
      startHour = Math.floor(nextSlotInMinutes / 60);
      startMinute = nextSlotInMinutes % 60;
      if (startHour >= 24) return [];
    }

    const options = [];
    for (let i = startHour * 2 + (startMinute === 30 ? 1 : 0); i < 48; i++) {
      const h = Math.floor(i / 2);
      const m = (i % 2) * 30;

      if (!isPickup && pickupDate && compareDate.toDateString() === pickupDate.toDateString() && pickupTime) {
        const [pickupHour, pickupMin] = pickupTime.split(':').map(Number);
        if (h * 60 + m <= pickupHour * 60 + pickupMin) continue;
      }

      const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const period = h >= 12 ? 'PM' : 'AM';
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const label = `${hour12}:${m.toString().padStart(2, '0')} ${period}`;
      options.push({ value, label });
    }
    return options;
  };

  // Set initial pickup time if today
  useEffect(() => {
    if (pickupDate) {
      const options = getTimeOptions(true);
      if (options.length > 0 && !pickupTime) {
        setPickupTime(options[0].value);
      }
    }
  }, [pickupDate]);

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const response = await fetch(`/api/vehicles?id=${params.vehicleId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch vehicle details');
        }
        const data = await response.json();

        // Normalize price data
        const normalizedData = {
          ...data,
          price_per_hour: Number(data.price_per_hour || data.pricePerHour || 0),
          min_booking_hours: Number(data.min_booking_hours || data.minBookingHours || 1)
        };

        console.log('Vehicle data:', normalizedData);
        setVehicle(normalizedData);
      } catch (err) {
        console.error('Error fetching vehicle:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [params.vehicleId]);

  // When dates change, set dropoff at least minBookingHours after pickup
  useEffect(() => {
    if (pickupDate && vehicle?.min_booking_hours) {
      const minHours = vehicle.min_booking_hours;
      const newDropoffDate = new Date(pickupDate);
      newDropoffDate.setHours(newDropoffDate.getHours() + minHours);
      setDropoffDate(newDropoffDate);
    }
  }, [pickupDate, vehicle?.min_booking_hours]);

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="container mx-auto py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error || 'Vehicle not found'}</p>
        </div>
      </div>
    );
  }

  // Parse images
  let images = [];
  try {
    images = Array.isArray(vehicle.images)
      ? vehicle.images
      : typeof vehicle.images === 'string'
        ? JSON.parse(vehicle.images)
        : [];
  } catch (e) {
    images = [];
  }

  // Parse locations
  let locations: string[] = [];
  try {
    if (Array.isArray(vehicle.location)) {
      // Clean each location in array
      locations = vehicle.location.map(loc => {
        if (typeof loc === 'string') {
          return loc.replace(/[\[\]"']/g, '').trim();
        }
        return String(loc).replace(/[\[\]"']/g, '').trim();
      }).filter(Boolean);
    } else if (typeof vehicle.location === 'string') {
      try {
        // Try parsing as JSON
        const parsedLoc = JSON.parse(vehicle.location);
        if (Array.isArray(parsedLoc)) {
          locations = parsedLoc.map(loc => {
            if (typeof loc === 'string') {
              return loc.replace(/[\[\]"']/g, '').trim();
            }
            return String(loc).replace(/[\[\]"']/g, '').trim();
          }).filter(Boolean);
        } else {
          // Single value from JSON
          locations = [String(parsedLoc).replace(/[\[\]"']/g, '').trim()];
        }
      } catch (e) {
        // Handle string that might look like an array but isn't valid JSON
        if (vehicle.location.includes('[') && vehicle.location.includes(']')) {
          // Remove brackets and split by commas
          const cleanedStr = vehicle.location.replace(/^\[|\]$/g, '').trim();
          locations = cleanedStr.split(',').map(s =>
            s.replace(/[\[\]"']/g, '').trim()
          ).filter(Boolean);
        } else {
          // Simple string
          locations = [vehicle.location.replace(/[\[\]"']/g, '').trim()];
        }
      }
    }
  } catch (e) {
    locations = [];
  }

  // Display locations properly with formatting
  const formattedLocations = locations.filter(Boolean);

  // Calculate total hours and price
  const calculateTotalHours = () => {
    if (!pickupDate || !dropoffDate) return 0;
    const pickup = new Date(pickupDate);
    pickup.setHours(parseInt(pickupTime.split(':')[0]), parseInt(pickupTime.split(':')[1]), 0);

    const dropoff = new Date(dropoffDate);
    dropoff.setHours(parseInt(dropoffTime.split(':')[0]), parseInt(dropoffTime.split(':')[1]), 0);

    const diffMs = dropoff.getTime() - pickup.getTime();
    const hours = Math.max(diffMs / (1000 * 60 * 60), vehicle.min_booking_hours);
    return hours;
  };

  const totalHours = calculateTotalHours();
  const totalPrice = totalHours * vehicle.price_per_hour;

  const handleProceedToBooking = () => {
    if (!pickupDate || !dropoffDate) {
      toast.error('Please select dates for your booking');
      return;
    }

    const formattedPickupDate = format(pickupDate, 'yyyy-MM-dd');
    const formattedDropoffDate = format(dropoffDate, 'yyyy-MM-dd');

    router.push(
      `/vehicles/${params.vehicleId}/booking?pickupDate=${formattedPickupDate}&pickupTime=${pickupTime}&dropoffDate=${formattedDropoffDate}&dropoffTime=${dropoffTime}`
    );
  };

  return (
    <div className="container mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Image Gallery */}
        <div className="space-y-4">
          <div className="relative aspect-video rounded-lg overflow-hidden">
            {images[0] ? (
              <Image
                src={images[0]}
                alt={vehicle.name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <Car className="w-12 h-12 text-gray-400" />
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {images.slice(1, 5).map((image: string, index: number) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden">
                  <Image
                    src={image}
                    alt={`${vehicle.name} - Image ${index + 2}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Vehicle Details */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{vehicle.name}</h1>
            <p className="text-gray-600 mt-2">{vehicle.description || 'No description available'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700">
                {formattedLocations.length > 0 ?
                  (formattedLocations.length > 1 ?
                    `${formattedLocations[0]} + ${formattedLocations.length - 1} more` :
                    formattedLocations[0]
                  ) : 'Multiple locations'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700">Min {vehicle.min_booking_hours} hours</span>
            </div>
            <div className="flex items-center space-x-2">
              <IndianRupee className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700">₹{vehicle.price_per_hour}/hour</span>
            </div>
            <div className="flex items-center space-x-2">
              <Car className="w-5 h-5 text-gray-500" />
              <span className="text-gray-700 capitalize">{vehicle.type}</span>
            </div>
          </div>

          {/* Booking Form */}
          <Card>
            <CardHeader>
              <CardTitle>Book Now</CardTitle>
              <CardDescription>Select your dates and times</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Pickup Date */}
                <div className="space-y-2">
                  <Label htmlFor="pickupDate">Pickup Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !pickupDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {pickupDate ? format(pickupDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={pickupDate}
                        onSelect={setPickupDate}
                        disabled={(date) => date < new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Pickup Time */}
                <div className="space-y-2">
                  <Select value={pickupTime} onValueChange={setPickupTime}>
                    <SelectTrigger id="pickupTime">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTimeOptions(true).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dropoff Date */}
                <div className="space-y-2">
                  <Label htmlFor="dropoffDate">Dropoff Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dropoffDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dropoffDate ? format(dropoffDate, "PPP") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dropoffDate}
                        onSelect={setDropoffDate}
                        disabled={(date) =>
                          !pickupDate || date < pickupDate
                        }
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Dropoff Time */}
                <div className="space-y-2">
                  <Label htmlFor="dropoffTime">Dropoff Time</Label>
                  <Select value={dropoffTime} onValueChange={setDropoffTime}>
                    <SelectTrigger id="dropoffTime">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {getTimeOptions(false).map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Pricing Summary */}
              <div className="mt-4 border-t pt-4">
                <div className="flex justify-between mb-2">
                  <span>Duration:</span>
                  <span>{(() => {
                    const h = Math.floor(totalHours);
                    const m = Math.round((totalHours - h) * 60);
                    if (h === 0) return `${m} mins`;
                    if (m === 0) return `${h} hour${h === 1 ? '' : 's'}`;
                    return `${h} hour${h === 1 ? '' : 's'} ${m} mins`;
                  })()}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span>Rate:</span>
                  <span>₹{vehicle.price_per_hour}/hour</span>
                </div>
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>₹{totalPrice}</span>
                </div>
              </div>

              <Button className="w-full mt-4" onClick={handleProceedToBooking}>
                Proceed to Booking
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 