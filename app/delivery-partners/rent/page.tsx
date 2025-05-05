'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import Navbar from '@/app/(main)/components/Navbar';
import { formatCurrency } from '@/lib/utils/currency';
import Image from 'next/image';

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

  const vehicleId = searchParams.get('vehicleId');
  const duration = searchParams.get('duration') || '7';

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
          <Button 
            onClick={() => router.back()} 
            className="mt-4"
          >
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
                  <p className="text-gray-600">Available at: {vehicle.location.join(', ')}</p>
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
                      // TODO: Implement booking logic
                      router.push(`/delivery-partners/book?vehicleId=${vehicle.id}&duration=${duration}`);
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