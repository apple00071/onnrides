'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Star, MapPin, Calendar, IndianRupee } from 'lucide-react';
import Navbar from '@/app/(main)/components/Navbar';
import { formatDateTimeIST } from '@/lib/utils/timezone';
import { formatCurrency } from '@/lib/utils/currency';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface DeliveryPartner {
  id: string;
  user_id: string;
  is_available: boolean;
  current_location: any;
  rating: number;
  total_trips: number;
  created_at: Date;
  updated_at: Date;
  user_name: string;
  user_phone: string;
}

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

const AVAILABLE_LOCATIONS = ['Madhapur', 'Erragadda'] as const;

export default function DeliveryPartnersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get booking details from URL params
  const location = searchParams.get('location');
  const pickupDate = searchParams.get('pickupDate');
  const pickupTime = searchParams.get('pickupTime');
  const duration = searchParams.get('duration') || '7'; // Default to 7 days

  const startDate = pickupDate && pickupTime 
    ? new Date(`${pickupDate}T${decodeURIComponent(pickupTime)}`)
    : null;

  const updateQueryParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    router.push(`/delivery-partners?${params.toString()}`);
  };

  const handleLocationChange = (value: string) => {
    updateQueryParams({ location: value });
  };

  const handleDurationChange = (value: string) => {
    updateQueryParams({ duration: value });
  };

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const queryString = searchParams.toString();
        const response = await fetch(`/api/vehicles/delivery?${queryString}`);
        if (!response.ok) {
          throw new Error('Failed to fetch available vehicles');
        }
        const data = await response.json();
        setVehicles(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, [searchParams]);

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

  if (error) {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600">{error}</p>
          <Button 
            onClick={() => router.back()} 
            className="mt-4 bg-white text-black hover:bg-gray-100"
          >
            Go Back
          </Button>
        </div>
      </>
    );
  }

  if (vehicles.length === 0) {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <h1 className="text-2xl font-bold mb-4">No Vehicles Available</h1>
          <p className="text-gray-600 mb-8">No vehicles are available for delivery partners at this time.</p>
          <Button 
            onClick={() => router.back()}
            className="bg-white text-black hover:bg-gray-100"
          >
            Go Back
          </Button>
        </div>
      </>
    );
  }

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

  return (
    <>
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col gap-4 mb-8">
          <h1 className="text-3xl font-bold">Available Vehicles for Delivery Partners</h1>
          <p className="text-gray-600">
            Select a vehicle to rent for your delivery work. All vehicles come with insurance and maintenance coverage.
          </p>
          {startDate && (
            <div className="text-sm text-gray-600">
              Starting from: {formatDateTimeIST(startDate)}
            </div>
          )}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Location</span>
              <Select
                value={location || ''}
                onValueChange={handleLocationChange}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_LOCATIONS.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Duration</span>
              <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
                {['7', '15', '30'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDurationChange(d)}
                    className={`px-3 py-1 text-sm ${
                      duration === d
                        ? 'bg-orange-500 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {d} days
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((vehicle) => (
            <Card key={vehicle.id} className="p-6">
              <div className="relative w-full h-48 mb-4 overflow-hidden rounded-lg bg-gray-100">
                <img
                  src={vehicle.images[0] || '/images/placeholder-vehicle.png'}
                  alt={vehicle.name}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.src = '/images/placeholder-vehicle.png';
                  }}
                />
              </div>
              
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">{vehicle.name}</h2>
                  <div className="flex items-center text-gray-600 mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="text-sm">{vehicle.location.join(', ')}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center text-gray-600">
                    <Calendar className="w-4 h-4 mr-2" />
                    <span>{duration} days rental</span>
                  </div>
                  <div className="flex items-center font-semibold text-lg">
                    {formatCurrency(getPriceForDuration(vehicle) || 0)}
                  </div>
                </div>

                <Button 
                  className="w-full mt-4" 
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('vehicleId', vehicle.id);
                    params.set('duration', duration);
                    router.push(`/delivery-partners/rent?${params.toString()}`);
                  }}
                >
                  Rent Vehicle
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
} 