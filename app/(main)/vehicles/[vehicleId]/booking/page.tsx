'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import { calculateDuration } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Link from 'next/link';
import Script from 'next/script';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  location: string[];
  images: string[] | string;
  price_per_hour: number;
  min_booking_hours: number;
}

interface Props {
  params: {
    vehicleId: string;
  };
  searchParams: {
    pickupDate?: string;
    pickupTime?: string;
    dropoffDate?: string;
    dropoffTime?: string;
    location?: string;
  };
}

export default function BookingPage({ params, searchParams }: Props) {
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchVehicle() {
      try {
        const response = await fetch(`/api/vehicles/${params.vehicleId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch vehicle');
        }
        const data = await response.json();
        setVehicle(data);
      } catch (error) {
        logger.error('Error fetching vehicle:', error);
        toast.error('Failed to load vehicle details');
      } finally {
        setLoading(false);
      }
    }

    fetchVehicle();
  }, [params.vehicleId]);

  if (loading || !vehicle) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const startDate = (() => {
    if (searchParams.pickupDate && searchParams.pickupTime) {
      const [hours, minutes] = searchParams.pickupTime.split(':');
      const date = new Date(searchParams.pickupDate);
      date.setHours(parseInt(hours), parseInt(minutes));
      return date;
    }
    return new Date();
  })();

  const endDate = (() => {
    if (searchParams.dropoffDate && searchParams.dropoffTime) {
      const [hours, minutes] = searchParams.dropoffTime.split(':');
      const date = new Date(searchParams.dropoffDate);
      date.setHours(parseInt(hours), parseInt(minutes));
      return date;
    }
    return new Date();
  })();
  
  // Calculate duration in hours
  const durationInHours = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60));
  
  // Check if booking includes weekend days (Saturday or Sunday)
  const isWeekend = startDate.getDay() === 0 || startDate.getDay() === 6 || 
                    endDate.getDay() === 0 || endDate.getDay() === 6;

  // Calculate billable hours based on rules
  const calculateBillableHours = () => {
    if (isWeekend) {
      // Weekend: minimum 24 hours
      return Math.max(24, durationInHours);
    } else {
      // Weekday: minimum 12 hours for bookings under 12 hours
      if (durationInHours <= 12) {
        return 12;
      }
      return durationInHours;
    }
  };

  const billableHours = calculateBillableHours();
  
  // Calculate base price and taxes
  const hourlyRate = Number(vehicle.price_per_hour);
  const basePrice = hourlyRate * billableHours;
  const gst = basePrice * 0.18; // 18% GST
  const serviceFee = basePrice * 0.05; // 5% service fee
  const totalDue = basePrice + gst + serviceFee;

  const formatPrice = (price: number) => price.toFixed(1);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Create booking first
      const bookingResponse = await fetch('/api/user/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: params.vehicleId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        }),
      });

      if (!bookingResponse.ok) {
        const data = await bookingResponse.json();
        if (bookingResponse.status === 401) {
          localStorage.setItem('redirectAfterLogin', window.location.pathname);
          toast.error('Please sign in or sign up to complete your booking');
          router.push('/auth/login');
          return;
        }
        throw new Error(data.error || 'Failed to create booking');
      }

      const bookingData = await bookingResponse.json();

      // Create payment order
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: bookingData.id,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create payment order');
      }

      const orderData = await orderResponse.json();

      // Initialize Razorpay payment
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'OnnRides',
        description: `Booking #${bookingData.id}`,
        order_id: orderData.order.id,
        prefill: {
          name: session?.user?.name || '',
          email: session?.user?.email || '',
        },
        theme: {
          color: '#f26e24',
        },
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                bookingId: bookingData.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            // Wait for a short delay to ensure the database is updated
            await new Promise(resolve => setTimeout(resolve, 1000));

            toast.success('Payment successful!');
            router.push('/bookings');
          } catch (error) {
            toast.error('Payment verification failed');
            logger.error('Payment verification error:', error);
          }
        },
        modal: {
          ondismiss: function() {
            toast.error('Payment cancelled');
            setIsLoading(false);
          },
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      logger.error('Error in payment process:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
      />
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Summary */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-6">SUMMARY</h2>
            <div className="flex flex-col md:flex-row gap-8">
              {/* Vehicle Image and Details */}
              <div className="w-full md:w-1/3">
                <div className="relative w-full h-[200px]">
                  <Image
                    src={(() => {
                      if (!vehicle.images) return '/placeholder.png';
                      
                      // If it's already an array, use the first image
                      if (Array.isArray(vehicle.images)) {
                        return vehicle.images[0] || '/placeholder.png';
                      }
                      
                      // If it's a string, try to parse it
                      try {
                        const parsedImages = JSON.parse(vehicle.images);
                        return Array.isArray(parsedImages) && parsedImages.length > 0
                          ? parsedImages[0]
                          : '/placeholder.png';
                      } catch {
                        // If parsing fails, return the string directly if it's a valid URL
                        return typeof vehicle.images === 'string' && vehicle.images.startsWith('http')
                          ? vehicle.images
                          : '/placeholder.png';
                      }
                    })()}
                    alt={vehicle.name}
                    fill
                    className="object-contain rounded-lg"
                  />
                </div>
                <h3 className="text-xl font-bold mt-4">{vehicle.name}</h3>
              </div>

              {/* Booking Details */}
              <div className="w-full md:w-2/3">
                {/* Date and Time */}
                <div className="flex justify-between text-lg mb-6">
                  <div>
                    <div>{format(startDate, 'h:mm a')}</div>
                    <div className="text-sm text-gray-600">{format(startDate, 'yyyy-MM-dd')}</div>
                  </div>
                  <div className="self-center text-gray-400">to</div>
                  <div>
                    <div>{format(endDate, 'h:mm a')}</div>
                    <div className="text-sm text-gray-600">{format(endDate, 'yyyy-MM-dd')}</div>
                  </div>
                </div>

                {/* Location */}
                <div className="mb-6">
                  <p className="text-gray-600">{searchParams.location}</p>
                  <p className="text-sm text-gray-500">3-15 ayyappa society Madhapur, Hyderabad</p>
                </div>

                {/* Total */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t">
                  <span>Total</span>
                  <span className="text-xl font-bold">₹{formatPrice(totalDue)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Billing Details */}
        <div className="bg-white rounded-lg p-6 h-fit">
          <h2 className="text-xl font-bold mb-6">Billing Details</h2>

          {/* Apply Coupon */}
          <div className="mb-6">
            <h3 className="text-lg mb-4">Apply Coupon</h3>
            <div className="flex gap-2">
              <Input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Coupon code"
                className="flex-1"
              />
              <Button variant="outline" className="whitespace-nowrap">
                APPLY
              </Button>
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="space-y-4">
            <div className="flex justify-between">
              <span>Vehicle Rental Charges</span>
              <span>₹{formatPrice(basePrice)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST (18%)</span>
              <span>₹{formatPrice(gst)}</span>
            </div>
            <div className="flex justify-between">
              <span>Service Fee (5%)</span>
              <span>₹{formatPrice(serviceFee)}</span>
            </div>
            <div className="flex justify-between font-medium pt-4 border-t">
              <span>Total Due</span>
              <span>₹{formatPrice(totalDue)}</span>
            </div>
          </div>

          {/* Make Payment Button */}
          <Button 
            className="w-full mt-6 bg-[#FFD60A] hover:bg-[#FFD60A]/90 text-black font-medium"
            size="lg"
            onClick={handleBooking}
          >
            {isLoading ? 'Processing...' : 'Make payment'}
          </Button>

          {/* Terms Note */}
          <div className="mt-4 space-y-2">
            <p className="text-sm text-gray-600 flex gap-2">
              <span className="text-gray-400">⚠</span>
              An immediate cancellation can lead to a penalty of up to 100%. Carefully check & review your booking before proceeding.
            </p>
            <Link 
              href="/terms" 
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Terms & Conditions
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 