'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import logger from '@/lib/logger';
import type { Booking } from '@/lib/types/booking';
import { BookingCard } from '@/components/bookings/BookingCard';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchBookings();
    }
  }, [status]);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/user/bookings');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch bookings');
      }
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch bookings');
      }

      setBookings(data.data || []);
    } catch (error) {
      logger.error('Error fetching bookings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/user/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cancel booking');
      }

      toast.success('Booking cancelled successfully');
      fetchBookings(); // Refresh the list
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to cancel booking');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h2 className="text-2xl font-semibold mb-2">No Bookings Found</h2>
        <p className="text-gray-600">You haven't made any bookings yet.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {bookings.map((booking) => (
          <BookingCard
            key={booking.id}
            booking={booking}
            onCancel={() => handleCancelBooking(booking.id)}
          />
        ))}
      </div>
    </div>
  );
} 