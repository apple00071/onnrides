'use client';

import logger from '@/lib/logger';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';
import { useSession } from 'next-auth/react';
import { initializeRazorpayPayment } from '../providers/RazorpayProvider';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface BookingDetails {
  id: string;
  booking_id: string;
  total_price: number;
  vehicle: {
    id: string;
    name: string;
    type: string;
  };
  pickup_datetime: Date;
  dropoff_datetime: Date;
  total_hours: number;
  user_phone?: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        if (!bookingId) {
          throw new Error('No booking ID provided');
        }

        logger.debug('Fetching booking details for:', bookingId);
        const response = await fetch(`/api/user/bookings/${bookingId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch booking details');
        }
        
        const data = await response.json();
        logger.debug('Booking data received:', data);
        
        if (!data.booking?.total_price || !data.booking?.booking_id) {
          throw new Error('Invalid booking data received');
        }
        
        setBooking(data.booking);
      } catch (error) {
        logger.error('Booking fetch error:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to load booking details');
        router.push('/bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, router]);

  const handlePayment = async () => {
    try {
      if (!booking) {
        throw new Error('No booking details available');
      }

      if (!booking.booking_id) {
        throw new Error('Invalid booking ID');
      }

      setProcessing(true);
      logger.debug('Starting payment process...', {
        bookingId: booking.booking_id,
        amount: booking.total_price
      });

      // Create Razorpay order
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.booking_id,
          amount: booking.total_price,
        }),
      });

      const responseData = await orderResponse.json();
      logger.debug('Order API response:', responseData);

      if (!orderResponse.ok || !responseData.success) {
        throw new Error(responseData.error || 'Failed to create payment order');
      }

      const { orderId, key, amount } = responseData.data;

      // Initialize payment
      await initializeRazorpayPayment({
        key,
        amount,
        currency: 'INR',
        orderId,
        bookingId: booking.booking_id,
        prefill: {
          name: session?.user?.name || '',
          email: session?.user?.email || '',
          contact: booking.user_phone || ''
        }
      });

      // If payment is successful, redirect to bookings page
      router.push('/bookings');
    } catch (error) {
      logger.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading || !booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto p-4 space-y-4">
      <div className="bg-white rounded-lg shadow-sm">
        {/* Vehicle Details Section */}
        <div className="p-4 border-b">
          <h1 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Details</h1>
          <div className="space-y-4">
            <div>
              <h3 className="text-base font-medium text-gray-900">{booking.vehicle.name}</h3>
              <p className="text-sm text-gray-500 capitalize">{booking.vehicle.type}</p>
            </div>
            
            <div className="flex justify-between items-center text-sm">
              <div>
                <p className="text-gray-600">Pickup Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(booking.pickup_datetime).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className="text-gray-600">Drop-off Date</p>
                <p className="font-medium text-gray-900">
                  {new Date(booking.dropoff_datetime).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm pt-2">
              <p className="text-gray-600">Duration</p>
              <p className="font-medium text-gray-900">{booking.total_hours} Hours</p>
            </div>
          </div>
        </div>

        {/* Billing Details Section */}
        <div className="p-4 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Billing Details</h2>
          
          {/* Charges Breakdown */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Vehicle Rental Charges</span>
              <span className="text-gray-900 font-medium">{formatCurrency(booking.total_price)}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Service Fee (5%)</span>
              <span className="text-gray-900 font-medium">{formatCurrency(booking.total_price * 0.05)}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">GST (18%)</span>
              <span className="text-gray-900 font-medium">{formatCurrency(booking.total_price * 0.18)}</span>
            </div>

            {/* Coupon Section */}
            <div className="py-3 border-t border-b">
              <button className="text-primary text-sm font-medium flex items-center">
                <span className="mr-1">Apply Coupon</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </button>
            </div>

            {/* Total Amount */}
            <div className="pt-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-gray-900">Total Amount</span>
                <span className="text-lg font-semibold text-primary">
                  {formatCurrency(booking.total_price * 1.23)} {/* Base + Service Fee + GST */}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                (Inclusive of all taxes)
              </p>
            </div>

            {/* Booking ID */}
            <div className="text-xs text-gray-500 pt-2">
              Booking ID: {booking.booking_id}
            </div>
          </div>
        </div>

        {/* Payment Button */}
        <div className="p-4 bg-gray-50 rounded-b-lg">
          <button
            onClick={handlePayment}
            disabled={processing}
            className="w-full px-4 py-3.5 bg-primary text-white rounded-lg font-medium text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors flex items-center justify-center"
          >
            {processing ? (
              <>
                <Loader className="w-4 h-4 mr-2" />
                Processing...
              </>
            ) : (
              'Proceed to Payment'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 