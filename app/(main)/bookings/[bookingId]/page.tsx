'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { format } from 'date-fns';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string[];
  images: string[];
  price_per_hour: number;
}

interface Booking {
  id: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  start_date: string;
  end_date: string;
  duration: number;
  amount: number;
  vehicle: Vehicle;
}

interface Props {
  params: {
    bookingId: string;
  };
}

export default function BookingDetailsPage({ params }: Props) {
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBooking() {
      try {
        const response = await fetch(`/api/bookings/${params.bookingId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch booking');
        }
        const data = await response.json();
        setBooking(data.booking);
      } catch (error) {
        console.error('Error fetching booking:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchBooking();
  }, [params.bookingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Booking not found</h1>
        <button
          onClick={() => router.push('/bookings')}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
        >
          Back to Bookings
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">Booking Details</h1>
          <button
            onClick={() => router.push('/bookings')}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Back to Bookings
          </button>
        </div>

        {/* Vehicle Details */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="relative h-48 rounded-t-lg overflow-hidden">
            <Image
              src={booking.vehicle.images[0] || '/placeholder.png'}
              alt={booking.vehicle.name}
              fill
              className="object-cover"
            />
          </div>
          <div className="p-4">
            <h2 className="text-xl font-semibold mb-2">{booking.vehicle.name}</h2>
            <p className="text-gray-500 capitalize">{booking.vehicle.type}</p>
            <p className="text-gray-500">{booking.vehicle.location.join(', ')}</p>
          </div>
        </div>

        {/* Booking Details */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Booking Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="font-medium">{format(new Date(booking.start_date), 'PPP p')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">End Date</p>
                <p className="font-medium">{format(new Date(booking.end_date), 'PPP p')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium capitalize">{booking.status}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Summary */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4">
            <h3 className="text-lg font-semibold mb-4">Booking Summary</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Duration</span>
                <span>{booking.duration} {booking.duration === 1 ? 'hour' : 'hours'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Rate per hour</span>
                <span>₹{booking.vehicle.price_per_hour}</span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="font-semibold">Total Amount</span>
                <span className="font-semibold">₹{booking.amount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 