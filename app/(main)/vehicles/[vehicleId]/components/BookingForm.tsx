'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { DateTimePicker } from '@/components/date-time-picker';
import { calculateDuration } from '@/lib/utils';

interface BookingFormProps {
  vehicleId: string;
  pricePerHour: number;
  minBookingHours: number;
  vehicleName: string;
}

export default function BookingForm({ vehicleId, pricePerHour, minBookingHours = 1, vehicleName }: BookingFormProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

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
          id="pickup-date"
          value={startDate}
          onChange={setStartDate}
          minDate={new Date()}
          className="mt-1"
        />
      </div>

      <div>
        <label htmlFor="dropoff-date" className="block text-sm font-medium text-gray-700">
          Dropoff Date & Time
        </label>
        <DateTimePicker
          id="dropoff-date"
          value={endDate}
          onChange={setEndDate}
          minDate={startDate || new Date()}
          className="mt-1"
        />
      </div>

      {startDate && endDate && (
        <div className="text-sm text-gray-500">
          Duration: {calculateDuration(startDate, endDate)} hours
          <br />
          Estimated Cost: ₹{(calculateDuration(startDate, endDate) * pricePerHour).toFixed(2)}
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