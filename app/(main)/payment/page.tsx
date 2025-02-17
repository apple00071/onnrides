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
    <div className="container max-w-2xl py-8">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold mb-6">Payment</h1>
        
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold">{booking.vehicle.name}</h2>
            <p className="text-gray-500 capitalize">{booking.vehicle.type}</p>
            <p className="text-sm text-gray-500 mt-2">Booking ID: {booking.booking_id}</p>
          </div>

          <div className="border-t pt-4">
            <div className="flex justify-between font-medium">
              <span>Total Amount</span>
              <span className="text-primary">
                {formatCurrency(booking.total_price)}
              </span>
            </div>
          </div>

          <button
            onClick={handlePayment}
            disabled={processing}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </div>
  );
} 