'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import { formatDateToIST } from '@/lib/utils';

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
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const pollingTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const maxRetries = 5;
  const baseDelay = 10000; // 10 seconds

  const fetchCurrentBooking = async () => {
    try {
      const response = await fetch('/api/user/current-booking');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch current booking');
      }
      const data = await response.json();
      setCurrentBooking(data.booking);
      retryCountRef.current = 0; // Reset retry count on successful fetch
    } catch (error) {
      logger.error('Error fetching current booking:', error);
      // Only show error toast if it's not a network error (to avoid spamming the user during retries)
      if (error instanceof Error && !error.message.includes('fetch')) {
        toast.error('Unable to load current booking. Please try again later.');
      }
      retryCountRef.current++;
    } finally {
      setLoading(false);
    }
  };

  const startPolling = useCallback(() => {
    // Clear any existing polling
    if (pollingTimeoutRef.current) {
      clearTimeout(pollingTimeoutRef.current);
    }

    // Only continue polling if we haven't exceeded max retries
    if (retryCountRef.current < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCountRef.current);
      pollingTimeoutRef.current = setTimeout(() => {
        fetchCurrentBooking();
        startPolling(); // Schedule next poll
      }, delay);
    }
  }, []);

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
      startPolling();

      // Cleanup polling on unmount
      return () => {
        if (pollingTimeoutRef.current) {
          clearTimeout(pollingTimeoutRef.current);
        }
      };
    } else {
      setLoading(false);
      setHistoryLoading(false);
    }
  }, [user, startPolling]);

  const formatDate = (dateString: string) => {
    return formatDateToIST(dateString);
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
                  <p><span className="font-medium">From:</span> <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{currentBooking.pickup_location}</span></p>
                  <p><span className="font-medium">To:</span> <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{currentBooking.drop_location}</span></p>
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