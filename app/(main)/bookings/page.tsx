'use client';

import logger from '@/lib/logger';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { format, parseISO, isValid } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import { formatDateToIST } from '@/lib/utils';

interface Booking {
  id: string;
  status: string;
  start_date: string;
  end_date: string;
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
            className="text-sm text-blue-600 hover:text-blue-800"
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
    return formatDateToIST(dateString);
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
              className="mt-4 text-sm text-blue-600 hover:text-blue-800"
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
function BookingCard({ 
  booking, 
  formatDate, 
  parseLocation
}: { 
  booking: Booking;
  formatDate: (date: string) => string;
  parseLocation: (location: string | string[]) => string;
}) {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            {booking.vehicle?.name || 'Vehicle name not available'}
            <span className="ml-2 text-sm text-gray-500">
              {booking.booking_id ? `#${booking.booking_id}` : ''}
            </span>
          </h3>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 text-xs font-medium rounded-full ${
              booking.status === 'cancelled'
                ? 'bg-red-100 text-red-800'
                : booking.payment_status === 'completed'
                ? 'bg-green-100 text-green-800'
                : booking.payment_status === 'pending'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {booking.status === 'cancelled'
                ? 'Cancelled'
                : booking.payment_status === 'completed'
                ? 'Confirmed'
                : booking.payment_status === 'pending'
                ? 'Payment Pending'
                : booking.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-500">Pickup</p>
            <div>
              <p className="font-medium">{formatDate(booking.start_date)}</p>
              <p className="text-sm text-gray-600 mt-1">
                {parseLocation(booking.vehicle?.location)}
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Drop-off</p>
            <div>
              <p className="font-medium">{formatDate(booking.end_date)}</p>
              <p className="text-sm text-gray-600 mt-1">
                {parseLocation(booking.vehicle?.location)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t mt-4">
          <div>
            <p className="text-sm text-gray-500">Total Amount</p>
            <p className="text-lg font-semibold">
              ₹{(booking.total_price || 0).toFixed(2)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 