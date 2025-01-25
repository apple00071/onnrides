'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader } from '@/components/ui/loader';
import { toast } from 'react-hot-toast';
import { Vehicle } from '@/lib/types';

export default function BookingPage({ params }: { params: { vehicleId: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVehicleAndRedirect = async () => {
      try {
        // Fetch vehicle data
        const response = await fetch(`/api/vehicles/${params.vehicleId}`);
        if (!response.ok) throw new Error('Failed to fetch vehicle');
        const data = await response.json();
        const vehicle: Vehicle = data.vehicle;

        console.log('Vehicle data:', vehicle); // Debug log

        // Get all the search params
        const pickupDate = searchParams.get('pickupDate');
        const pickupTime = searchParams.get('pickupTime');
        const dropoffDate = searchParams.get('dropoffDate');
        const dropoffTime = searchParams.get('dropoffTime');
        const location = searchParams.get('location');

        // Redirect to booking summary with all params
        const queryParams = new URLSearchParams({
          vehicleId: params.vehicleId,
          vehicleName: vehicle.name,
          vehicleImage: Array.isArray(vehicle.images) && vehicle.images.length > 0 ? vehicle.images[0] : '',
          pricePerHour: vehicle.price_per_hour?.toString() || '0',
          pickupDate: pickupDate || '',
          pickupTime: pickupTime || '',
          dropoffDate: dropoffDate || '',
          dropoffTime: dropoffTime || '',
          location: location || ''
        });

        console.log('Query params:', Object.fromEntries(queryParams.entries())); // Debug log

        router.push(`/booking-summary?${queryParams.toString()}`);
      } catch (error) {
        console.error('Error fetching vehicle:', error); // Debug log
        toast.error('Failed to load vehicle details');
        router.push('/');
      }
    };

    fetchVehicleAndRedirect();
  }, [params.vehicleId, searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader className="w-8 h-8" />
    </div>
  );
} 