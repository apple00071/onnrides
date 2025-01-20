'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Vehicle } from '@/lib/types';
import { calculateDuration, calculateTotalPrice, formatCurrency } from '@/lib/utils';
import { DateTimePicker } from '@/components/date-time-picker';

interface BookingFormProps {
  vehicle: Vehicle;
}

export default function BookingForm({ vehicle }: BookingFormProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const duration = startDate && endDate ? calculateDuration(startDate, endDate) : 0;
  const totalPrice = startDate && endDate ? calculateTotalPrice(startDate, endDate, vehicle.price_per_hour) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!startDate || !endDate) {
      toast.error('Please select pickup and drop-off dates');
      return;
    }

    if (duration < vehicle.min_booking_hours) {
      toast.error(`Minimum booking duration is ${vehicle.min_booking_hours} hours`);
      return;
    }

    try {
      setLoading(true);

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_id: vehicle.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          duration,
          amount: totalPrice,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create booking');
      }

      const booking = await response.json();
      router.push(`/bookings/${booking.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-bold mb-1">{vehicle.name}</h2>
            <p className="text-gray-500 capitalize">{vehicle.type}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-primary">{formatCurrency(vehicle.price_per_hour)}/hour</p>
            <p className="text-sm text-gray-500">Min. {vehicle.min_booking_hours} hours</p>
          </div>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            Pickup Date & Time
          </label>
          <DateTimePicker
            id="startDate"
            value={startDate}
            onChange={setStartDate}
            minDate={new Date()}
          />
        </div>

        <div>
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            Drop-off Date & Time
          </label>
          <DateTimePicker
            id="endDate"
            value={endDate}
            onChange={setEndDate}
            minDate={startDate || new Date()}
          />
        </div>
      </div>

      {startDate && endDate && (
        <div className="border-t pt-4 mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Duration</span>
            <span>{duration} hours</span>
          </div>
          <div className="flex justify-between font-medium">
            <span>Total Amount</span>
            <span className="text-primary">{formatCurrency(totalPrice)}</span>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading || !startDate || !endDate}
        className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating Booking...' : 'Continue Booking'}
      </button>
    </form>
  );
} 