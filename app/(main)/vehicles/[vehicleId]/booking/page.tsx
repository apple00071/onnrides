'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import Script from 'next/script';
import logger from '@/lib/logger';
import { calculateDuration } from '@/lib/utils';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string[];
  images: string[];
  price_per_hour: number;
  min_booking_hours: number;
}

interface Props {
  params: {
    vehicleId: string;
  };
  searchParams: {
    pickupDate?: string | string[];
    dropoffDate?: string | string[];
  };
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BookingPage({ params, searchParams }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  useEffect(() => {
    async function fetchVehicle() {
      try {
        const response = await fetch(`/api/vehicles/${params.vehicleId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch vehicle');
        }
        const data = await response.json();
        setVehicle(data.vehicle);
      } catch (error) {
        logger.error('Error fetching vehicle:', error);
        toast.error('Failed to load vehicle details');
      } finally {
        setLoading(false);
      }
    }

    fetchVehicle();
  }, [params.vehicleId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Vehicle not found</h1>
        <button
          onClick={() => router.push('/vehicles')}
          className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90"
        >
          Back to Vehicles
        </button>
      </div>
    );
  }

  const startDate = new Date(Array.isArray(searchParams.pickupDate) ? searchParams.pickupDate[0] : searchParams.pickupDate || '');
  const endDate = new Date(Array.isArray(searchParams.dropoffDate) ? searchParams.dropoffDate[0] : searchParams.dropoffDate || '');
  const duration = calculateDuration(startDate, endDate);
  const amount = duration * vehicle.price_per_hour;

  const handlePayment = async () => {
    if (!session?.user) {
      toast.error('Please login to make a booking');
      router.push('/login');
      return;
    }

    setLoading(true);
    try {
      // Create booking
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: vehicle.id,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!bookingResponse.ok) {
        const error = await bookingResponse.json();
        throw new Error(error.error || 'Failed to create booking');
      }

      const { booking } = await bookingResponse.json();

      // Create Razorpay order
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.id,
        }),
      });

      if (!orderResponse.ok) {
        const error = await orderResponse.json();
        throw new Error(error.error || 'Failed to create payment order');
      }

      const { orderId, amount, currency, key } = await orderResponse.json();

      // Initialize Razorpay payment
      const options = {
        key,
        amount: amount,
        currency: currency,
        name: 'OnnRides',
        description: `Booking Payment for ${vehicle.name}`,
        order_id: orderId,
        prefill: {
          name: session.user.name,
          email: session.user.email,
        },
        theme: {
          color: '#f26e24',
        },
        handler: async function (response: any) {
          try {
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              const error = await verifyResponse.json();
              throw new Error(error.error || 'Payment verification failed');
            }

            toast.success('Booking confirmed successfully!');
            router.push('/bookings');
          } catch (error) {
            logger.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        },
        modal: {
          ondismiss: function () {
            toast.error('Payment cancelled');
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      logger.error('Booking error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold">Booking Summary</h1>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Back
            </button>
          </div>

          {/* Vehicle Details */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="relative h-48 rounded-t-lg overflow-hidden">
              <Image
                src={vehicle.images[0] || '/placeholder.png'}
                alt={vehicle.name}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-4">
              <h2 className="text-xl font-semibold mb-2">{vehicle.name}</h2>
              <p className="text-gray-500 capitalize">{vehicle.type}</p>
              <p className="text-gray-500">{vehicle.location.join(', ')}</p>
            </div>
          </div>

          {/* Booking Details */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Booking Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Pickup Date & Time</p>
                  <p className="font-medium">{format(startDate, 'PPP p')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Dropoff Date & Time</p>
                  <p className="font-medium">{format(endDate, 'PPP p')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Price Summary */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="p-4">
              <h3 className="text-lg font-semibold mb-4">Price Summary</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Duration</span>
                  <span>{duration} {duration === 1 ? 'hour' : 'hours'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rate per hour</span>
                  <span>₹{vehicle.price_per_hour}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="font-semibold">Total Amount</span>
                  <span className="font-semibold">₹{amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            disabled={loading}
            className="w-full px-4 py-3 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Proceed to Payment'}
          </button>
        </div>
      </div>
    </>
  );
} 