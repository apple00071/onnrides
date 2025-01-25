'use client';

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
  total_amount: number;
  vehicle: {
    name: string;
    type: string;
  };
}

export default function PaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch(`/api/user/bookings/${bookingId}`);
        if (!response.ok) throw new Error('Failed to fetch booking details');
        const data = await response.json();
        setBooking(data.booking);
      } catch (error) {
        toast.error('Failed to load booking details');
        router.push('/bookings');
      } finally {
        setLoading(false);
      }
    };

    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId, router]);

  const handlePayment = async () => {
    try {
      setLoading(true);

      // Create Razorpay order
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          amount: booking?.total_amount,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create payment order');
      }

      const { orderId } = await orderResponse.json();

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: booking?.total_amount * 100, // Amount in paise
        currency: 'INR',
        name: 'OnnRides',
        description: `Booking for ${booking?.vehicle.name}`,
        order_id: orderId,
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                bookingId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            // Send WhatsApp confirmation
            await fetch('/api/notifications/whatsapp', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                bookingId,
              }),
            });

            toast.success('Payment successful!');
            router.push('/bookings');
          } catch (error) {
            toast.error('Payment verification failed. Please contact support.');
          }
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

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      toast.error('Payment failed. Please try again.');
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
        strategy="lazyOnload"
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
                  {formatCurrency(booking.total_amount)}
                </span>
              </div>
            </div>

            <button
              onClick={handlePayment}
              disabled={loading}
              className="w-full px-4 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Pay Now'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 