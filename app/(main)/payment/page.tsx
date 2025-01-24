'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import logger from '@/lib/logger';
import { toast } from 'react-hot-toast';
import Script from 'next/script';
import { format } from 'date-fns';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string;
  price_per_hour: number;
  images: string;
}

interface BookingDetails {
  id: string;
  user_id: string;
  vehicle_id: string;
  start_date: number;
  end_date: number;
  total_hours: number;
  total_price: number;
  status: string;
  payment_status: string;
  vehicle?: Vehicle;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [loading, setLoading] = useState(true);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);

  const initializePayment = useCallback(async () => {
    if (!bookingId) {
      toast.error('Booking ID is missing');
      router.push('/bookings');
      return;
    }

    if (!window.Razorpay) {
      toast.error('Payment system is not loaded yet. Please try again.');
      return;
    }

    try {
      console.log('Creating payment order...');
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        console.error('Order creation failed:', errorData);
        throw new Error(errorData.message || 'Failed to create payment order');
      }

      const orderData = await orderResponse.json();
      console.log('Order created:', orderData);

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(bookingDetails?.total_price || 0) * 100, // Convert to smallest currency unit (paise)
        currency: 'INR',
        name: 'OnnRides',
        description: 'Vehicle Rental Payment',
        order_id: orderData.order.id,
        handler: async (response: any) => {
          try {
            console.log('Payment successful, verifying...', response);
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            toast.success('Payment successful!');
            router.push(`/bookings?success=true&booking_number=${bookingId}`);
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: '', // Will be filled from user session if needed
          email: '', // Will be filled from user session if needed
          contact: '', // Will be filled from user session if needed
        },
        theme: {
          color: '#f26e24',
        },
        modal: {
          ondismiss: function() {
            console.log('Payment modal dismissed');
            setLoading(false);
          }
        }
      };

      console.log('Initializing Razorpay with options:', { ...options, key: '***' });
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to initiate payment');
      router.push('/bookings');
    } finally {
      setLoading(false);
    }
  }, [bookingId, router, bookingDetails]);

  // Handle Razorpay script load
  const handleRazorpayLoad = useCallback(() => {
    console.log('Razorpay script loaded');
    setRazorpayLoaded(true);
  }, []);

  // Fetch booking details
  useEffect(() => {
    async function fetchBookingDetails() {
      if (!bookingId) return;

      try {
        console.log('Fetching booking details...');
        const response = await fetch(`/api/bookings/${bookingId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch booking details');
        }
        const data = await response.json();
        console.log('Booking details received:', data);
        setBookingDetails(data);
      } catch (error) {
        console.error('Error fetching booking details:', error);
        toast.error('Failed to load booking details');
        router.push('/bookings');
      } finally {
        setLoading(false);
      }
    }

    fetchBookingDetails();
  }, [bookingId, router]);

  useEffect(() => {
    if (bookingDetails && !loading && razorpayLoaded) {
      console.log('Initializing payment...');
      initializePayment();
    }
  }, [bookingDetails, loading, razorpayLoaded, initializePayment]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={handleRazorpayLoad}
      />
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Processing Payment</h1>
        {bookingDetails && (
          <div className="mb-6 space-y-2">
            <p><span className="font-semibold">Vehicle:</span> {bookingDetails.vehicle?.name || 'N/A'}</p>
            <p><span className="font-semibold">Pickup:</span> {format(new Date(bookingDetails.start_date), 'PPP p')}</p>
            <p><span className="font-semibold">Drop-off:</span> {format(new Date(bookingDetails.end_date), 'PPP p')}</p>
            <p><span className="font-semibold">Duration:</span> {bookingDetails.total_hours} hours</p>
            <p><span className="font-semibold">Amount:</span> ₹{bookingDetails.total_price}</p>
          </div>
        )}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            {!razorpayLoaded 
              ? 'Loading payment system...' 
              : 'Please wait while we initialize your payment...'}
          </p>
        </div>
      </div>
    </div>
  );
} 