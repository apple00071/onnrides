'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import { formatDateTimeIST } from '@/lib/utils/timezone';

interface Booking {
  id: string;
  booking_id: string;
  vehicle_name: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  pickup_location: string;
  drop_location: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

interface PaginationData {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export default function MyBooking() {
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);
  const [bookingHistory, setBookingHistory] = useState<Booking[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({ total: 0, page: 1, limit: 10, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(true);
  const { user } = useAuth();

  const fetchCurrentBooking = async () => {
    try {
      const response = await fetch('/api/user/current-booking');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch current booking');
      }
      const data = await response.json();
      setCurrentBooking(data.booking);
    } catch (error) {
      logger.error('Error fetching current booking:', error);
      // Only show error toast if it's not a network error (to avoid spamming the user during retries)
      if (error instanceof Error && !error.message.includes('fetch')) {
        toast.error('Unable to load current booking. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingHistory = async (page = 1) => {
    try {
      setHistoryLoading(true);
      const response = await fetch(`/api/user/bookings?page=${page}&limit=10`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch booking history');
      }
      const data = await response.json();
      setBookingHistory(data.bookings);
      setPagination(data.pagination);
    } catch (error) {
      logger.error('Error fetching booking history:', error);
      // Only show error toast for non-network errors
      if (error instanceof Error && !error.message.includes('fetch')) {
        toast.error('Unable to load booking history. Please try again later.');
      }
      setBookingHistory([]);
      setPagination({ total: 0, page: 1, limit: 10, totalPages: 0 });
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      // Initial fetches
      fetchCurrentBooking();
      fetchBookingHistory();

      // Set up polling for current booking with exponential backoff
      let retryCount = 0;
      const maxRetries = 5;
      const baseDelay = 10000; // 10 seconds

      const intervalId = setInterval(() => {
        if (retryCount >= maxRetries) {
          clearInterval(intervalId);
          return;
        }
        fetchCurrentBooking().catch(() => {
          retryCount++;
          if (retryCount >= maxRetries) {
            clearInterval(intervalId);
          }
        });
      }, baseDelay * Math.pow(2, retryCount));

      // Cleanup interval on unmount
      return () => clearInterval(intervalId);
    } else {
      setLoading(false);
      setHistoryLoading(false);
    }
  }, [user]);

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'N/A';
      return formatDateTimeIST(dateString);
    } catch (error) {
      logger.error('Error formatting date:', { dateString, error });
      return 'Invalid date';
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchBookingHistory(newPage);
    }
  };

  if (!user) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Please log in to view your bookings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-8">
      {/* Current Booking Section */}
      <section>
        <h1 className="text-2xl font-bold mb-4">Current Booking</h1>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : currentBooking ? (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">{currentBooking.vehicle_name}</h2>
                <div className="space-y-2">
                  <p><span className="font-medium">Pickup:</span> {formatDate(currentBooking.pickup_datetime)}</p>
                  <p><span className="font-medium">Dropoff:</span> {formatDate(currentBooking.dropoff_datetime)}</p>
                  <p><span className="font-medium">From:</span> {currentBooking.pickup_location}</p>
                  <p><span className="font-medium">To:</span> {currentBooking.drop_location}</p>
                </div>
              </div>
              <div>
                <div className="space-y-2">
                  <p><span className="font-medium">Booking ID:</span> {currentBooking.booking_id}</p>
                  <p><span className="font-medium">Status:</span> <span className="capitalize">{currentBooking.status}</span></p>
                  <p><span className="font-medium">Payment Status:</span> <span className="capitalize">{currentBooking.payment_status}</span></p>
                  <p><span className="font-medium">Total Amount:</span> ₹{currentBooking.total_amount}</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600">You don&apos;t have any active bookings.</p>
          </div>
        )}
      </section>

      {/* Booking History Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Booking History</h2>
        {historyLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : bookingHistory.length > 0 ? (
          <>
            <div className="space-y-4">
              {bookingHistory.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-2">{booking.vehicle_name}</h3>
                      <div className="space-y-2">
                        <p><span className="font-medium">Booking ID:</span> {booking.booking_id}</p>
                        <p><span className="font-medium">Pickup:</span> {formatDate(booking.pickup_datetime)}</p>
                        <p><span className="font-medium">Dropoff:</span> {formatDate(booking.dropoff_datetime)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p><span className="font-medium">Status:</span> <span className="capitalize">{booking.status}</span></p>
                      <p><span className="font-medium">Payment Status:</span> <span className="capitalize">{booking.payment_status}</span></p>
                      <p><span className="font-medium">Total Amount:</span> ₹{booking.total_amount}</p>
                      <p><span className="font-medium">Booked on:</span> {formatDate(booking.created_at)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-6">
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
          </>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6">
            <p className="text-gray-600">No booking history found.</p>
          </div>
        )}
      </section>
    </div>
  );
} 