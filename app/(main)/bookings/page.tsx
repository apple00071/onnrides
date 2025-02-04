'use client';

import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { format, parseISO, isValid } from 'date-fns';

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
  const [loading, setLoading] = useState(true);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to safely format dates
  const formatDate = (dateString: string, formatStr: string) => {
    try {
      if (!dateString) {
        logger.error('Empty date string received');
        return 'Date not available';
      }
      const date = parseISO(dateString);
      if (!isValid(date)) {
        logger.error('Invalid date:', { dateString });
        return 'Invalid date';
      }
      return format(date, formatStr);
    } catch (error) {
      logger.error('Error formatting date:', { dateString, error });
      return 'Invalid date';
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

  useEffect(() => {
    // Show success message if booking was just completed
    if (success && bookingNumber) {
      toast.success(`Booking confirmed! Your booking number is ${bookingNumber}`);
    }
  }, [success, bookingNumber]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        logger.info('Starting to fetch bookings...');

        const response = await fetch('/api/bookings');
        const responseText = await response.text();
        logger.info('Raw API response:', { 
          status: response.status,
          statusText: response.statusText,
          responseText
        });

        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          logger.error('Failed to parse API response:', {
            error: parseError,
            responseText
          });
          throw new Error('Invalid response from server');
        }

        logger.info('Parsed API response:', {
          success: data.success,
          hasData: !!data.data,
          dataLength: data.data?.length,
          firstBooking: data.data?.[0] ? {
            id: data.data[0].id,
            status: data.data[0].status,
            dates: {
              start: data.data[0].start_date,
              end: data.data[0].end_date
            }
          } : null
        });

        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch bookings');
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch bookings');
        }

        if (!Array.isArray(data.data)) {
          logger.error('Invalid data format:', { data });
          throw new Error('Invalid data format received');
        }

        setBookings(data.data);
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

    fetchBookings();
  }, []);

  // Log component state changes
  useEffect(() => {
    logger.info('Bookings state updated:', {
      loading,
      error,
      bookingsCount: bookings.length,
      hasBookings: bookings.length > 0,
      firstBooking: bookings[0] ? {
        id: bookings[0].id,
        status: bookings[0].status
      } : null
    });
  }, [bookings, loading, error]);

  const handleMakePayment = async (booking: Booking) => {
    if (isProcessingPayment) {
      return;
    }

    if (!booking || !booking.id) {
      toast.error('Invalid booking information');
      return;
    }

    try {
      setIsProcessingPayment(true);
      logger.debug('Initiating payment for booking:', booking.id);

      // Check if Razorpay is loaded
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Payment system is not loaded yet. Please refresh the page.');
      }

      // Create order
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create payment order');
      }

      const data = await response.json();
      logger.debug('Payment order created:', data);

      // Initialize Razorpay
      const options = {
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: data.name,
        description: data.description,
        order_id: data.order_id,
        prefill: data.prefill,
        theme: data.theme,
        handler: async function (response: any) {
          try {
            logger.debug('Payment successful, verifying...', response);
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                bookingId: booking.id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            toast.success('Payment successful!');
            window.location.href = `/bookings?success=true&booking_number=${booking.id}`;
          } catch (error) {
            logger.error('Payment verification error:', error);
            toast.error('Payment verification failed');
          }
        },
        modal: {
          ondismiss: function() {
            setIsProcessingPayment(false);
          }
        }
      };

      logger.debug('Initializing Razorpay with options:', { ...options, key: '***' });
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      logger.error('Payment initiation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initiate payment');
      setIsProcessingPayment(false);
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
            onClick={() => window.location.reload()}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Try refreshing the page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Bookings</h1>

        {!bookings || bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-500">No bookings found</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-4 text-sm text-blue-600 hover:text-blue-800"
            >
              Refresh page
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => {
              // Log each booking being rendered
              logger.debug('Rendering booking:', {
                id: booking.id,
                status: booking.status,
                dates: {
                  start: booking.start_date,
                  end: booking.end_date
                }
              });

              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-lg shadow overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {booking.vehicle?.name || 'Vehicle name not available'}
                        <span className="ml-2 text-sm text-gray-500">
                          {booking.booking_id ? `#${booking.booking_id}` : ''}
                        </span>
                      </h2>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : booking.payment_status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-800'
                            : booking.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.status === 'cancelled'
                            ? 'Cancelled'
                            : booking.payment_status === 'completed'
                            ? 'Confirmed'
                            : booking.status === 'confirmed'
                            ? 'Pending Payment'
                            : booking.status === 'pending'
                            ? 'Pending'
                            : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-500">Pickup</p>
                        <div>
                          <p className="font-medium">
                            {formatDate(booking.start_date, 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(booking.start_date, 'hh:mm a')}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {parseLocation(booking.vehicle?.location)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Drop-off</p>
                        <div>
                          <p className="font-medium">
                            {formatDate(booking.end_date, 'MMM d, yyyy')}
                          </p>
                          <p className="text-sm text-gray-600">
                            {formatDate(booking.end_date, 'hh:mm a')}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {parseLocation(booking.vehicle?.location)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
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
            })}
          </div>
        )}
      </div>
    </div>
  );
} 