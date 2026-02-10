'use client';

import logger from '@/lib/logger';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { format, parseISO } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { formatDateTimeIST } from '@/lib/utils/timezone';
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
    // Show success message if booking was just completed
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
    booking.status === 'confirmed' &&
    booking.payment_status === 'completed' &&
    new Date(booking.end_date) > new Date()
  );

  const pendingBookings = bookings.filter(booking =>
    booking.status === 'pending' ||
    (booking.status === 'confirmed' && booking.payment_status === 'pending')
  );

  const pastBookings = bookings.filter(booking =>
    (booking.status === 'completed' || new Date(booking.end_date) <= new Date()) ||
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

  // Helper function to safely parse location
  const parseLocation = (location: string | string[]): string => {
    try {
      if (!location) {
        return 'Location not available';
      }
      if (typeof location === 'string') {
        const parsed = JSON.parse(location);
        return Array.isArray(parsed) ? parsed[0] : location;
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

        {!bookings || bookings.length === 0 ? (
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
            {/* Current Bookings */}
            {currentBookings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Current Bookings</h2>
                <div className="grid gap-6">
                  {currentBookings.map(booking => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      formatDate={formatDate}
                      parseLocation={parseLocation}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Pending Bookings */}
            {pendingBookings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Pending Bookings</h2>
                <div className="grid gap-6">
                  {pendingBookings.map(booking => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      formatDate={formatDate}
                      parseLocation={parseLocation}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Past Bookings</h2>
                <div className="grid gap-6">
                  {pastBookings.map(booking => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      formatDate={formatDate}
                      parseLocation={parseLocation}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-8">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Previous
                </button>
                <span className="text-gray-600">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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

// BookingCard component
function BookingCard({ booking, formatDate, parseLocation }: {
  booking: Booking;
  formatDate: (date: string) => { date: string; time: string };
  parseLocation: (location: string | string[]) => string;
}) {
  // Extract date and time parts from formatted strings from API
  const getDateAndTimeParts = (formattedDateString: string | undefined, fallbackDate: string) => {
    if (formattedDateString) {
      // If it's already a formatted string from the API like "07 May 2025, 4:30 PM"
      const parts = formattedDateString.split(',');
      if (parts.length === 2) {
        return {
          date: parts[0].trim(),
          time: parts[1].trim()
        };
      }
    }

    // Fallback to our formatDate function
    return formatDate(fallbackDate);
  };

  // Get pickup date/time
  const pickupDateTime = getDateAndTimeParts(
    booking.formatted_pickup as string,
    booking.pickup_datetime || booking.start_date
  );

  // Get dropoff date/time
  const dropoffDateTime = getDateAndTimeParts(
    booking.formatted_dropoff as string,
    booking.dropoff_datetime || booking.end_date
  );

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">{booking.vehicle.name}</h3>
          <p className="text-gray-500 text-sm">{booking.booking_id}</p>
        </div>
        <div className="flex gap-2">
          <Badge variant={booking.status === 'confirmed' ? 'default' : 'secondary'}>
            {booking.status === 'confirmed' ? 'Confirmed' : 'Pending'}
          </Badge>
          <Badge variant={booking.payment_status === 'completed' ? 'default' : 'secondary'}>
            {booking.payment_status === 'completed' ? 'Payment Completed' : 'Payment Pending'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <p className="text-gray-600 mb-1">Pickup</p>
          <p className="font-medium">{pickupDateTime.date}</p>
          <p className="text-sm text-gray-700">{pickupDateTime.time}</p>
          <p className="text-gray-500 text-sm mt-1">{parseLocation(booking.pickup_location || booking.vehicle.location)}</p>
        </div>
        <div>
          <p className="text-gray-600 mb-1">Drop-off</p>
          <p className="font-medium">{dropoffDateTime.date}</p>
          <p className="text-sm text-gray-700">{dropoffDateTime.time}</p>
          <p className="text-gray-500 text-sm mt-1">{parseLocation(booking.dropoff_location || booking.pickup_location || booking.vehicle.location)}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Amount</span>
          <span className="text-lg font-semibold">₹{booking.total_price}</span>
        </div>
      </div>
    </div>
  );
} 