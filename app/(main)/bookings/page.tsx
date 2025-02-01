'use client';

import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { format, parseISO, addMinutes } from 'date-fns';

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
        const response = await fetch('/api/bookings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch bookings');
        }

        // Log the first booking for debugging
        if (data.data && data.data.length > 0) {
          logger.info('First booking from API:', {
            booking: JSON.stringify(data.data[0], null, 2)
          });
        }

        setBookings(data.data || []);
      } catch (error) {
        logger.error('Error fetching bookings:', error);
        toast.error('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Bookings</h1>

        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No bookings found</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {booking.vehicle.name}
                      <span className="ml-2 text-sm text-gray-500">
                        {booking.booking_id ? `#${booking.booking_id}` : ''}
                      </span>
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        booking.payment_status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'confirmed'
                          ? 'bg-blue-100 text-blue-800'
                          : booking.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.payment_status === 'completed'
                          ? 'Confirmed'
                          : booking.status === 'cancelled'
                          ? 'Cancelled'
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
                          {format(addMinutes(parseISO(booking.start_date), 330), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(addMinutes(parseISO(booking.start_date), 330), 'hh:mm a')}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {typeof booking.vehicle.location === 'string' 
                          ? JSON.parse(booking.vehicle.location)[0]
                          : Array.isArray(booking.vehicle.location)
                          ? booking.vehicle.location[0]
                          : 'Location not available'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Drop-off</p>
                      <div>
                        <p className="font-medium">
                          {format(addMinutes(parseISO(booking.end_date), 330), 'MMM d, yyyy')}
                        </p>
                        <p className="text-sm text-gray-600">
                          {format(addMinutes(parseISO(booking.end_date), 330), 'hh:mm a')}
                        </p>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {typeof booking.vehicle.location === 'string' 
                          ? JSON.parse(booking.vehicle.location)[0]
                          : Array.isArray(booking.vehicle.location)
                          ? booking.vehicle.location[0]
                          : 'Location not available'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <p className="text-lg font-semibold">₹{booking.total_price.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 