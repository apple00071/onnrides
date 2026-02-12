'use client';

import logger from '@/lib/logger';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { Badge } from '@/components/ui/badge';

interface Booking {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
  pickup_datetime?: string;
  dropoff_datetime?: string;
  total_price: number;
  payment_status: string;
  created_at: string;
  updated_at: string;
  vehicle: {
    id: string;
    name: string;
    type: string;
    location: string | string[];
    images: string;
    price_per_hour: number;
  };
  booking_id: string;
  pickup_location?: string;
  dropoff_location?: string;
  formatted_pickup?: {
    date: string;
    time: string;
  } | string;
  formatted_dropoff?: {
    date: string;
    time: string;
  } | string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const bookingNumber = searchParams.get('booking_number');

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookings = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);
      logger.info('Fetching bookings for page:', page);

      const response = await fetch(`/api/bookings?page=${page}&limit=10`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch bookings');
      }

      setBookings(data.data);
      setPagination(data.pagination);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch bookings';
      logger.error('Error in fetchBookings:', {
        error,
        message: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (success && bookingNumber) {
      toast.success(`Booking confirmed! Your booking number is ${bookingNumber}`);
    }
  }, [success, bookingNumber]);

  useEffect(() => {
    fetchBookings();
  }, []);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchBookings(newPage);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-600">Loading your bookings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Bookings</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchBookings(pagination.page)}
            className="text-sm text-orange-600 hover:text-orange-800"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const currentBookings = bookings.filter(booking =>
    (booking.status === 'confirmed' || booking.status === 'active' || booking.status === 'initiated') &&
    new Date(booking.end_date) > new Date()
  );

  const pendingBookings = bookings.filter(booking =>
    booking.status === 'pending' ||
    booking.status === 'failed' ||
    ((booking.status === 'confirmed' || booking.status === 'active') &&
      new Date(booking.end_date) > new Date() &&
      !['completed', 'fully_paid'].includes(booking.payment_status))
  );

  const pastBookings = bookings.filter(booking =>
    (booking.status === 'completed' || booking.status === 'finished' || new Date(booking.end_date) <= new Date()) ||
    booking.status === 'cancelled'
  );

  const formatDate = (dateString: string) => {
    try {
      const date = parseISO(dateString);
      const istDate = toZonedTime(date, 'Asia/Kolkata');
      return {
        date: format(istDate, 'dd MMM yyyy'),
        time: format(istDate, 'h:mm a')
      };
    } catch (error) {
      logger.error('Error formatting date:', error);
      return {
        date: 'Invalid date',
        time: 'Invalid time'
      };
    }
  };

  const parseLocation = (location: string | string[]): string => {
    try {
      if (!location) return 'Location not available';
      if (typeof location === 'string') {
        if (location.startsWith('[') || location.startsWith('{')) {
          const parsed = JSON.parse(location);
          return Array.isArray(parsed) ? parsed[0] : location;
        }
        return location;
      }
      return Array.isArray(location) ? location[0] : 'Location not available';
    } catch {
      return typeof location === 'string' ? location : 'Location not available';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Bookings</h1>

        {bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-500">No bookings found</p>
            <button
              onClick={() => fetchBookings(1)}
              className="mt-4 text-sm text-orange-600 hover:text-orange-800"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {currentBookings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Bookings</h2>
                <div className="grid gap-6">
                  {currentBookings.map(booking => (
                    <BookingCard key={booking.id} booking={booking} formatDate={formatDate} parseLocation={parseLocation} />
                  ))}
                </div>
              </section>
            )}

            {pendingBookings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Bookings</h2>
                <div className="grid gap-6">
                  {pendingBookings.map(booking => (
                    <BookingCard key={booking.id} booking={booking} formatDate={formatDate} parseLocation={parseLocation} />
                  ))}
                </div>
              </section>
            )}

            {pastBookings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Past Bookings</h2>
                <div className="grid gap-6">
                  {pastBookings.map(booking => (
                    <BookingCard key={booking.id} booking={booking} formatDate={formatDate} parseLocation={parseLocation} />
                  ))}
                </div>
              </section>
            )}

            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-8">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-gray-600">Page {pagination.page} of {pagination.totalPages}</span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BookingCard({ booking, formatDate, parseLocation }: {
  booking: Booking;
  formatDate: (date: string) => { date: string; time: string };
  parseLocation: (location: string | string[]) => string;
}) {
  const pickupDateTime = formatDate(booking.pickup_datetime || booking.start_date);
  const dropoffDateTime = formatDate(booking.dropoff_datetime || booking.end_date);

  const getStatusDisplay = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'confirmed') return { label: 'Confirmed', variant: 'default' };
    if (s === 'active' || s === 'completed') return { label: s.charAt(0).toUpperCase() + s.slice(1), variant: 'default' };
    if (s === 'cancelled') return { label: 'Cancelled', variant: 'destructive' };
    return { label: s.charAt(0).toUpperCase() + s.slice(1), variant: 'secondary' };
  };

  const getPaymentDisplay = (paymentStatus: string) => {
    const s = paymentStatus?.toLowerCase();
    if (s === 'completed' || s === 'fully_paid' || s === 'paid') return { label: 'Payment Completed', variant: 'default' };
    if (s === 'failed') return { label: 'Payment Failed', variant: 'destructive' };
    return { label: 'Payment Pending', variant: 'secondary' };
  };

  const statusInfo = getStatusDisplay(booking.status);
  const paymentInfo = getPaymentDisplay(booking.payment_status);

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{booking.vehicle.name}</h3>
          <p className="text-gray-500 text-sm">{booking.booking_id}</p>
        </div>
        <div className="flex gap-2">
          {/* @ts-ignore */}
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          {/* @ts-ignore */}
          <Badge variant={paymentInfo.variant}>{paymentInfo.label}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-gray-600 mb-1 font-medium text-sm">Pickup</p>
          <p className="font-semibold text-gray-900">{pickupDateTime.date}</p>
          <p className="text-sm text-gray-600">{pickupDateTime.time}</p>
          <p className="text-gray-500 text-xs mt-1 italic">{parseLocation(booking.pickup_location || booking.vehicle.location)}</p>
        </div>
        <div>
          <p className="text-gray-600 mb-1 font-medium text-sm">Drop-off</p>
          <p className="font-semibold text-gray-900">{dropoffDateTime.date}</p>
          <p className="text-sm text-gray-600">{dropoffDateTime.time}</p>
          <p className="text-gray-500 text-xs mt-1 italic">{parseLocation(booking.dropoff_location || booking.pickup_location || booking.vehicle.location)}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <span className="text-gray-600 font-medium">Total Amount</span>
          <span className="text-lg font-bold text-orange-600">₹{booking.total_price}</span>
        </div>
      </div>
    </div>
  );
}