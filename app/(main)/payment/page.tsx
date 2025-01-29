'use client';

import { logger } from '@/lib/logger';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import { Loader } from '@/components/ui/loader';
import Script from 'next/script';

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface BookingDetails {
  id: string;
  total_price: number;
  vehicle: {
    id: string;
    name: string;
    type: string;
  };
  pickup_datetime: Date;
  dropoff_datetime: Date;
  total_hours: number;
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const bookingId = searchParams.get('bookingId');

  // Add Razorpay script loading handler
  const handleRazorpayLoad = () => {
    logger.debug('Razorpay script loaded');
    setRazorpayLoaded(true);
  };

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        logger.debug('Fetching booking details for:', bookingId);
        const response = await fetch(`/api/user/bookings/${bookingId}`);
        
        if (!response.ok) {
          logger.error('Failed to fetch booking:', response.status);
          throw new Error('Failed to fetch booking details');
        }
        
        const data = await response.json();
        logger.debug('Booking data received:', data);
        
        if (!data.booking?.total_price) {
          logger.error('Invalid booking data:', data);
          throw new Error('Invalid booking data received');
        }
        
        setBooking(data.booking);
      } catch (error) {
        logger.error('Booking fetch error:', error);
        toast.error('Failed to load booking details');
        router.push('/bookings');
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchBooking();
    } else {
      logger.error('No booking ID provided');
      toast.error('No booking ID provided');
      router.push('/bookings');
    }
  }, [bookingId, router]);

  const handlePayment = async () => {
    try {
      if (!booking) {
        throw new Error('No booking details available');
      }

      setLoading(true);
      logger.debug('Starting payment process...');

      // Check if Razorpay is loaded
      if (typeof window.Razorpay === 'undefined') {
        logger.error('Razorpay not loaded');
        throw new Error('Payment system is not loaded yet. Please refresh the page.');
      }
      logger.debug('Razorpay SDK loaded successfully');

      // Create Razorpay order directly (no need to create booking as it already exists)
      logger.debug('Creating payment order for booking:', booking.id);
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.id,
          amount: booking.total_price,
        }),
      });

      const responseData = await orderResponse.json();
      logger.debug('Order API response:', responseData);

      if (!orderResponse.ok) {
        throw new Error(responseData.error || 'Failed to create payment order');
      }

      const { orderId, key, amount } = responseData;
      logger.debug('Payment configuration:', { orderId, key: '***', amount });

      if (!key || !orderId || !amount) {
        throw new Error('Invalid payment configuration received from server');
      }

      // Initialize Razorpay
      const options = {
        key,
        amount,
        currency: 'INR',
        name: 'OnnRides',
        description: `Booking for ${booking.vehicle.name}`,
        order_id: orderId,
        notes: {
          booking_id: booking.id
        },
        retry: {
          enabled: true,
          max_count: 3
        },
        handler: async (response: any) => {
          try {
            logger.debug('Payment successful, received response:', {
              ...response,
              razorpay_payment_id: '***',
              razorpay_signature: '***'
            });

            if (!response.razorpay_payment_id || !response.razorpay_order_id || !response.razorpay_signature) {
              throw new Error('Incomplete payment response received');
            }

            // Verify payment
            logger.debug('Verifying payment...');
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                bookingId: booking.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            const verifyData = await verifyResponse.json();
            logger.debug('Verification response:', verifyData);

            if (!verifyResponse.ok) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            toast.success('Payment successful! Redirecting to bookings...');
            router.push('/bookings');
          } catch (error) {
            logger.error('Payment verification error:', error);
            toast.error(error instanceof Error ? error.message : 'Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: function() {
            logger.debug('Payment modal dismissed');
            setLoading(false);
          },
          confirm_close: true,
          escape: false
        },
        prefill: {
          name: '', // Add user's name from session
          email: '', // Add user's email from session
          contact: '', // Add user's phone from session
        },
        theme: {
          color: '#f26e24',
        },
      };

      logger.debug('Initializing Razorpay with options:', {
        ...options,
        key: '***',
        handler: '[Function]'
      });

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      logger.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
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
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={handleRazorpayLoad}
        onError={(e) => {
          logger.error('Failed to load Razorpay script:', e);
          toast.error('Failed to load payment system. Please refresh the page.');
        }}
        onReady={() => logger.debug('Razorpay script ready')}
      />
      
      <div className="container max-w-2xl py-8">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold mb-6">Payment</h1>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-bold">{booking.vehicle.name}</h2>
              <p className="text-gray-500 capitalize">{booking.vehicle.type}</p>
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
              disabled={loading || !razorpayLoaded}
              className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : !razorpayLoaded ? 'Loading Payment System...' : 'Pay Now'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 