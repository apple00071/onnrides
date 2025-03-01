'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { VehicleStructuredData, RatingStructuredData } from '@/components/ui/SEOStructuredData';
import logger from '@/lib/logger';

// Create a single notification manager
function showNotification(message: string, type: 'success' | 'error' = 'error') {
  // Clear any existing notifications first
  toast.dismiss();
  // Show new notification
  if (type === 'success') {
    toast.success(message);
  } else {
    toast.error(message);
  }
}

interface VehicleDetailsPageProps {
  params: {
    vehicleId: string;
  };
}

async function checkVehicleAvailability(vehicleId: string, startDate: string, endDate: string) {
  try {
    const response = await fetch('/api/vehicles/check-availability', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        vehicleId,
        startDate: startDate.split('T')[0],
        endDate: endDate.split('T')[0],
        pickupTime: startDate.split('T')[1].split('.')[0],
        dropoffTime: endDate.split('T')[1].split('.')[0]
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to check availability');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    logger.error('Error checking availability:', error);
    throw error;
  }
}

export default function VehicleDetailsPage({ params }: VehicleDetailsPageProps) {
  const router = useRouter();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDates, setSelectedDates] = useState<{
    startDate: Date | null;
    endDate: Date | null;
  }>({
    startDate: null,
    endDate: null
  });

  useEffect(() => {
    // Fetch vehicle details
    const fetchVehicleDetails = async () => {
      try {
        const response = await fetch(`/api/vehicles/${params.vehicleId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch vehicle details');
        }
        const data = await response.json();
        setVehicle(data);
      } catch (error) {
        logger.error('Error fetching vehicle:', error);
        toast.error('Failed to load vehicle details');
      } finally {
        setLoading(false);
      }
    };

    fetchVehicleDetails();
  }, [params.vehicleId]);

  const handleDateChange = (dates: [Date | null, Date | null]) => {
    const [start, end] = dates;
    setSelectedDates({
      startDate: start,
      endDate: end
    });
  };

  const handleBookNow = () => {
    const { startDate, endDate } = selectedDates;
    if (!startDate || !endDate) return;

    // Proceed directly to booking summary
    const searchParams = new URLSearchParams({
      pickupDate: startDate.toISOString(),
      pickupTime: format(startDate, 'HH:mm'),
      dropoffDate: endDate.toISOString(),
      dropoffTime: format(endDate, 'HH:mm'),
      vehicleId: params.vehicleId
    });

    router.push(`/booking-summary?${searchParams.toString()}`);
  };

  return (
    <>
      {/* Add structured data for SEO */}
      {vehicle && (
        <>
          <VehicleStructuredData
            name={vehicle.name}
            description={vehicle.description || `Rent ${vehicle.name} in Hyderabad at affordable rates.`}
            image={vehicle.image_url || '/images/placeholder.jpg'}
            vehicleType={vehicle.vehicle_type || 'Scooter'}
            brand={vehicle.brand || 'Honda'}
            fuelType={vehicle.fuel_type || 'Petrol'}
            modelDate={vehicle.model_year || '2023'}
            offers={{
              price: vehicle.price_per_day.toString(),
              priceCurrency: 'INR',
              availability: vehicle.is_available ? 'InStock' : 'OutOfStock',
            }}
          />
          <RatingStructuredData
            itemName={vehicle.name}
            ratingValue={4.5}
            reviewCount={vehicle.review_count || 12}
          />
        </>
      )}
      
      <div>
        <Button 
          onClick={handleBookNow}
          disabled={!selectedDates.startDate || !selectedDates.endDate}
          className="w-full mt-4"
        >
          Book Now
        </Button>
      </div>
    </>
  );
} 