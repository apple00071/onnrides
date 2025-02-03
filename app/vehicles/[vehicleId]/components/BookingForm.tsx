'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import DateTimePicker from '@/components/ui/date-time-picker';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';
import { calculateDuration, formatCurrency, formatDuration } from '@/lib/utils';

interface BookingFormProps {
  vehicleId: string;
  pricePerHour: number;
  vehicleName: string;
}

export default function BookingForm({ vehicleId, pricePerHour, vehicleName }: BookingFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [location] = useState(searchParams.get('location'));

  useEffect(() => {
    // Get dates from search params if they exist
    const pickupDate = searchParams.get('pickupDate');
    const pickupTime = searchParams.get('pickupTime');
    const dropoffDate = searchParams.get('dropoffDate');
    const dropoffTime = searchParams.get('dropoffTime');

    if (pickupDate && pickupTime) {
      const date = new Date(`${pickupDate}T${pickupTime}`);
      if (!isNaN(date.getTime())) {
        setStartDate(date);
      }
    }

    if (dropoffDate && dropoffTime) {
      const date = new Date(`${dropoffDate}T${dropoffTime}`);
      if (!isNaN(date.getTime())) {
        setEndDate(date);
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

    if (!startDate || !endDate || !location) {
      toast.error('Please select pickup and drop-off times and location');
      return;
    }

    const duration = calculateDuration(startDate, endDate);
    if (duration < 2) { // Minimum 2 hours booking
      toast.error('Minimum booking duration is 2 hours');
      return;
    }

    // Proceed to payment/confirmation page
    const searchParams = new URLSearchParams({
      pickupDateTime: startDate.toISOString(),
      dropoffDateTime: endDate.toISOString(),
      location: location,
      vehicleId: vehicleId
    });

    router.push(`/booking-summary?${searchParams.toString()}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pickup Date & Time
        </label>
        <DateTimePicker
          date={startDate}
          setDate={setStartDate}
          minDate={new Date()}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Drop-off Date & Time
        </label>
        <DateTimePicker
          date={endDate}
          setDate={setEndDate}
          minDate={startDate || new Date()}
        />
      </div>

      {startDate && endDate && (
        <div className="space-y-4">
          <div className="text-sm space-y-2">
            <div className="flex justify-between">
              <span>Duration:</span>
              <span>{formatDuration(calculateDuration(startDate, endDate))}</span>
            </div>
            <div className="flex justify-between">
              <span>Base Price:</span>
              <span>{formatCurrency(calculateDuration(startDate, endDate) * pricePerHour)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>GST (18%):</span>
              <span>{formatCurrency(calculateDuration(startDate, endDate) * pricePerHour * 0.18)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Service Fee (5%):</span>
              <span>{formatCurrency(calculateDuration(startDate, endDate) * pricePerHour * 0.05)}</span>
            </div>
            <div className="flex justify-between font-medium pt-2 border-t">
              <span>Total Price:</span>
              <span>{formatCurrency(calculateTotalPrice(startDate, endDate))}</span>
            </div>
          </div>
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        disabled={!startDate || !endDate || !location}
      >
        Continue Booking
      </Button>
    </form>
  );
} 