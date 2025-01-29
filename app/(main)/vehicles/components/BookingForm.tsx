import { logger } from '@/lib/logger';
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DateTimePicker } from '@/components/date-time-picker';
import { calculateDuration } from '@/lib/utils';

interface BookingFormProps {
  vehicleId: string;
  pricePerHour: number;
  minBookingHours?: number;
  vehicleName: string;
}

export default function BookingForm({ vehicleId, pricePerHour, minBookingHours = 1, vehicleName }: BookingFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    // Get dates from search params if they exist
    const pickupParam = searchParams.get('pickupDate');
    const dropoffParam = searchParams.get('dropoffDate');

    if (pickupParam) {
      try {
        const date = new Date(pickupParam);
        if (!isNaN(date.getTime())) {
          setStartDate(date);
        } else {
          logger.error('Invalid pickup date in URL:', pickupParam);
        }
      } catch (error) {
        logger.error('Error parsing pickup date:', error);
      }
    }
    
    if (dropoffParam) {
      try {
        const date = new Date(dropoffParam);
        if (!isNaN(date.getTime())) {
          setEndDate(date);
        } else {
          logger.error('Invalid dropoff date in URL:', dropoffParam);
        }
      } catch (error) {
        logger.error('Error parsing dropoff date:', error);
      }
    }
  }, [searchParams]);

  const calculateTotalPrice = (start: Date, end: Date) => {
    const durationHours = calculateDuration(start, end);
    const basePrice = durationHours * pricePerHour;
    
    // Add GST (18%)
    const gst = basePrice * 0.18;
    
    // Add service fee (5%)
    const serviceFee = basePrice * 0.05;
    
    return basePrice + gst + serviceFee;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      return;
    }

    const duration = calculateDuration(startDate, endDate);
    if (duration < minBookingHours) {
      alert(`Minimum booking duration is ${minBookingHours} ${minBookingHours === 1 ? 'hour' : 'hours'}`);
      return;
    }

    const searchParams = new URLSearchParams({
      pickupDate: startDate.toISOString(),
      dropoffDate: endDate.toISOString(),
    });

    router.push(`/vehicles/${vehicleId}/booking?${searchParams.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="pickup-date" className="block text-sm font-medium text-gray-700">
          Pickup Date & Time
        </label>
        <DateTimePicker
          date={startDate}
          setDate={setStartDate}
          minDate={new Date()}
          className="mt-1"
        />
      </div>

      <div>
        <label htmlFor="dropoff-date" className="block text-sm font-medium text-gray-700">
          Dropoff Date & Time
        </label>
        <DateTimePicker
          date={endDate}
          setDate={setEndDate}
          minDate={startDate || new Date()}
          className="mt-1"
        />
      </div>

      {startDate && endDate && (
        <div className="text-sm space-y-2">
          <div className="text-gray-500">
            Duration: {calculateDuration(startDate, endDate)} hours
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Base Price:</span>
              <span>₹{(calculateDuration(startDate, endDate) * pricePerHour).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>GST (18%):</span>
              <span>₹{(calculateDuration(startDate, endDate) * pricePerHour * 0.18).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Service Fee (5%):</span>
              <span>₹{(calculateDuration(startDate, endDate) * pricePerHour * 0.05).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Total Price:</span>
              <span>₹{calculateTotalPrice(startDate, endDate).toFixed(2)}</span>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!startDate || !endDate}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Continue Booking
      </button>
    </form>
  );
} 