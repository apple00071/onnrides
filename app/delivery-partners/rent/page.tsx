'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Navbar from '@/app/(main)/components/Navbar';
import { formatCurrency } from '@/lib/utils/currency';
import Image from 'next/image';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string[];
  images: string[];
  delivery_price_7_days: number | null;
  delivery_price_15_days: number | null;
  delivery_price_30_days: number | null;
  vehicle_category: 'normal' | 'delivery' | 'both';
  is_available: boolean;
}

export default function RentVehiclePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [locationAvailability, setLocationAvailability] = useState<Record<string, boolean>>({});

  const vehicleId = searchParams.get('vehicleId');
  const duration = searchParams.get('duration') || '7';
  const pickupDate = searchParams.get('pickupDate') || '';
  const pickupTime = searchParams.get('pickupTime') || '';
  const dropoffDate = searchParams.get('dropoffDate') || '';
  const dropoffTime = searchParams.get('dropoffTime') || '';
  const locationParam = searchParams.get('location') || '';

  useEffect(() => {
    const fetchVehicle = async () => {
      if (!vehicleId) {
        setError('Vehicle ID is missing');
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/vehicles/delivery/${vehicleId}?duration=${duration}`);
        if (!response.ok) {
          throw new Error('Failed to fetch vehicle details');
        }
        const data = await response.json();
        setVehicle(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicle();
  }, [vehicleId, duration]);

  // Check per-location availability for this vehicle and selected time range
  useEffect(() => {
    if (!vehicle || !pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
      setLocationAvailability({});
      return;
    }

    let cancelled = false;

    const checkAvailability = async () => {
      const availability: Record<string, boolean> = {};

      for (const loc of vehicle.location) {
        try {
          const response = await fetch('/api/vehicles/check-availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vehicleId: vehicle.id,
              location: loc,
              // Use ISO strings so this matches the timestamps used by /api/bookings
              startDate: new Date(`${pickupDate}T${pickupTime}`).toISOString(),
              endDate: new Date(`${dropoffDate}T${dropoffTime}`).toISOString(),
            }),
          });

          if (!response.ok) {
            availability[loc] = true;
            continue;
          }

          const data = await response.json();
          availability[loc] = !!data.available;
        } catch {
          // On error, treat as available to avoid blocking bookings unnecessarily
          availability[loc] = true;
        }
      }

      if (cancelled) return;

      setLocationAvailability(availability);

      // Auto-select the first available location if current selection is unavailable
      setSelectedLocation((current) => {
        if (current && availability[current]) return current;
        const firstAvailable = vehicle.location.find((loc) => availability[loc]);
        return firstAvailable || '';
      });
    };

    checkAvailability();

    return () => {
      cancelled = true;
    };
  }, [vehicle, pickupDate, pickupTime, dropoffDate, dropoffTime]);

  const getPriceForDuration = (vehicle: Vehicle) => {
    switch (duration) {
      case '7':
        return vehicle.delivery_price_7_days;
      case '15':
        return vehicle.delivery_price_15_days;
      case '30':
        return vehicle.delivery_price_30_days;
      default:
        return vehicle.delivery_price_7_days;
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </>
    );
  }

  if (error || !vehicle) {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error || 'Vehicle not found'}</p>
          <Button onClick={() => router.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="relative h-64 md:h-full bg-gray-100 rounded-lg overflow-hidden">
                <Image
                  src={vehicle.images[0] || '/images/placeholder-vehicle.png'}
                  alt={vehicle.name}
                  fill
                  className="object-contain"
                  onError={(e: any) => {
                    e.target.src = '/images/placeholder-vehicle.png';
                  }}
                />
              </div>

              <div className="space-y-6">
                <div>
                  <h1 className="text-2xl font-bold mb-2">{vehicle.name}</h1>
                  <div className="space-y-2">
                    <p className="text-gray-600 text-sm">Available at</p>
                    <Select
                      value={selectedLocation}
                      onValueChange={setSelectedLocation}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicle.location.map((loc) => {
                          const isAvailable = locationAvailability[loc] ?? true;
                          return (
                            <SelectItem
                              key={loc}
                              value={loc}
                              disabled={!isAvailable}
                            >
                              <span className={isAvailable ? '' : 'text-gray-400'}>
                                {loc}
                                {!isAvailable ? ' (Unavailable)' : ''}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Duration</span>
                    <span className="font-semibold">{duration} days</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-gray-600">Total Amount</span>
                    <span className="font-semibold text-xl">
                      {formatCurrency(getPriceForDuration(vehicle) || 0)}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button
                    className="w-full"
                    onClick={() => {
                      const params = new URLSearchParams();

                      // Core booking details
                      params.set('vehicleId', vehicle.id);
                      params.set('vehicleName', vehicle.name);
                      const effectiveLocation =
                        selectedLocation ||
                        locationParam ||
                        (vehicle.location[0] || '');

                      if (effectiveLocation) {
                        params.set('location', effectiveLocation);
                      }

                      // Date and time (reuse existing pickup/dropoff from search params)
                      if (pickupDate) params.set('pickupDate', pickupDate);
                      if (pickupTime) params.set('pickupTime', pickupTime);
                      if (dropoffDate) params.set('dropoffDate', dropoffDate);
                      if (dropoffTime) params.set('dropoffTime', dropoffTime);

                      // Pricing: use delivery partner package prices as special pricing
                      params.set('pricePerHour', '0');
                      params.set('price7Days', String(vehicle.delivery_price_7_days || 0));
                      params.set('price15Days', String(vehicle.delivery_price_15_days || 0));
                      params.set('price30Days', String(vehicle.delivery_price_30_days || 0));

                      // Flag this as a delivery-partner booking (for future customization)
                      params.set('isDelivery', 'true');
                      params.set('durationDays', duration);

                      router.push(`/booking-summary?${params.toString()}`);
                    }}
                  >
                    Proceed to Book
                  </Button>

                  <Button 
                    variant="outline"
                    className="w-full" 
                    onClick={() => router.back()}
                  >
                    Go Back
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
} 