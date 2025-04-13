'use client';

import logger from '@/lib/logger';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { format, parseISO, isValid } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { formatDateToIST, formatBookingDateTime } from '@/lib/utils';
import { formatDateTimeIST } from '@/lib/utils/timezone';

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
  formatted_pickup?: string;
  formatted_dropoff?: string;
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
    // If the string is already formatted with AM/PM, return it directly
    if (typeof dateString === 'string' && (dateString.includes('AM') || dateString.includes('PM'))) {
      return dateString;
    }
    
    try {
      logger.debug('Formatting date in bookings page:', { dateString, type: typeof dateString });
      
      // Use our timezone utility function
      return formatDateTimeIST(dateString);
      
    } catch (error) {
      logger.error('Error formatting date', { dateString, error });
      return dateString;
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
function BookingCard({ 
  booking, 
  formatDate, 
  parseLocation
}: { 
  booking: Booking;
  formatDate: (date: string) => string;
  parseLocation: (location: string | string[]) => string;
}) {
  // Log booking data for debugging
  console.log('BookingCard data:', {
    id: booking.id,
    booking_id: booking.booking_id,
    start_date: booking.start_date,
    end_date: booking.end_date,
    pickup_datetime: booking.pickup_datetime,
    dropoff_datetime: booking.dropoff_datetime,
    formatted_pickup: booking.formatted_pickup,
    formatted_dropoff: booking.formatted_dropoff
  });
  
  // Determine which pickup and dropoff times to display
  const pickupTimeDisplay = booking.formatted_pickup || 
                           (booking.pickup_datetime ? formatDate(booking.pickup_datetime) : 
                            formatDate(booking.start_date));
                            
  const dropoffTimeDisplay = booking.formatted_dropoff || 
                            (booking.dropoff_datetime ? formatDate(booking.dropoff_datetime) : 
                             formatDate(booking.end_date));
  
  return (
    <div className="p-6 mb-4 bg-white rounded-lg shadow">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <div className="mb-2 md:mb-0">
          <h3 className="text-lg font-semibold">{booking.vehicle.name}</h3>
          <p className="text-gray-500 text-sm">{booking.booking_id}</p>
        </div>
        <div>
          <span className={`text-xs font-medium py-1 px-2 rounded-full ${
            booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
            booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
            'bg-yellow-100 text-yellow-800'
          }`}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </span>
          {booking.payment_status && (
            <span className={`ml-2 text-xs font-medium py-1 px-2 rounded-full ${
              booking.payment_status === 'paid' || booking.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
              booking.payment_status === 'refunded' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              Payment {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
            </span>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-gray-600 text-sm font-medium">Pickup</p>
          <p className="font-semibold">{pickupTimeDisplay}</p>
          <p className="text-gray-500 text-sm">{parseLocation(booking.vehicle.location)}</p>
        </div>
        <div>
          <p className="text-gray-600 text-sm font-medium">Drop-off</p>
          <p className="font-semibold">{dropoffTimeDisplay}</p>
          <p className="text-gray-500 text-sm">{parseLocation(booking.vehicle.location)}</p>
        </div>
      </div>
      
      <div className="mt-4 flex justify-between items-center">
        <p className="font-bold">₹{booking.total_price.toLocaleString('en-IN', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}</p>
      </div>
    </div>
  );
} 