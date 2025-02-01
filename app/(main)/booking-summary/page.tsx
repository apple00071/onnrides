'use client';

import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { formatCurrency, calculateBookingPrice } from '@/lib/utils'
import { useSession } from 'next-auth/react';
import type { Session } from 'next-auth';

interface BookingDetails {
  id: string;
  vehicleId: string;
  vehicleName: string;
  vehicleImage: string;
  pricePerHour: number;
  pickupDate: string;
  dropoffDate: string;
  pickupTime: string;
  dropoffTime: string;
  location: string;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function BookingSummaryPage() {
  const { user, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [couponCode, setCouponCode] = useState('')
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null)

  const { data: session } = useSession() as { data: Session | null };

  useEffect(() => {
    // Get booking details from URL params
    const details: BookingDetails = {
      id: searchParams.get('bookingId') || '',
      vehicleId: searchParams.get('vehicleId') || '',
      vehicleName: searchParams.get('vehicleName') || '',
      vehicleImage: (() => {
        const imageUrl = searchParams.get('vehicleImage');
        if (!imageUrl) return '/placeholder-car.jpg';
        try {
          return decodeURIComponent(imageUrl);
        } catch (e) {
          logger.error('Failed to decode image URL:', e);
          return '/placeholder-car.jpg';
        }
      })(),
      pricePerHour: Number(searchParams.get('pricePerHour')) || 0,
      pickupDate: searchParams.get('pickupDate') || '',
      dropoffDate: searchParams.get('dropoffDate') || '',
      pickupTime: searchParams.get('pickupTime') || '',
      dropoffTime: searchParams.get('dropoffTime') || '',
      location: (() => {
        const loc = searchParams.get('location');
        if (!loc) return '';
        try {
          // If it's already a JSON string, parse it
          const parsed = JSON.parse(loc);
          // If it's an array, take the first location
          if (Array.isArray(parsed)) {
            return parsed[0];
          }
          // If it's a string, return as is
          return parsed;
        } catch (e) {
          // If parsing fails, return the raw string
          return loc;
        }
      })()
    }

    logger.debug('Booking details:', details) // Debug log

    if (!details.vehicleId || !details.pickupDate || !details.dropoffDate) {
      toast.error('Missing booking details')
      router.push('/')
      return
    }

    setBookingDetails(details)
  }, [searchParams, router])

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => {
      logger.debug('Razorpay script loaded successfully');
    };
    script.onerror = (error) => {
      logger.error('Failed to load Razorpay script:', error);
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const handleConfirmBooking = async () => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    if (!user.id) {
      toast.error('User session is invalid. Please sign in again.')
      router.push('/auth/signin')
      return
    }

    if (!bookingDetails) return

    try {
      setLoading(true)

      // Check if Razorpay is loaded
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Payment system is not loaded. Please refresh the page and try again.');
      }
      
      // Format dates properly
      const pickupDateTime = new Date(`${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`)
      const dropoffDateTime = new Date(`${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`)
      
      // Calculate duration in hours
      const durationInHours = Math.ceil((dropoffDateTime.getTime() - pickupDateTime.getTime()) / (1000 * 60 * 60))
      
      // Calculate base price using the same logic as vehicle card
      const basePrice = calculateBookingPrice(
        {
          price_per_day: bookingDetails.pricePerHour,
          price_12hrs: bookingDetails.pricePerHour * 12,
          price_24hrs: bookingDetails.pricePerHour * 24,
          price_7days: bookingDetails.pricePerHour * 24 * 7,
          price_15days: bookingDetails.pricePerHour * 24 * 15,
          price_30days: bookingDetails.pricePerHour * 24 * 30,
          min_booking_hours: 5
        },
        pickupDateTime,
        dropoffDateTime
      );
      
      // Calculate taxes and fees
      const gst = basePrice * 0.18
      const serviceFee = basePrice * 0.05
      const totalAmount = basePrice + gst + serviceFee

      // Create booking first
      const bookingData = {
        vehicle_id: bookingDetails.vehicleId,
        start_date: pickupDateTime.toISOString(),
        end_date: dropoffDateTime.toISOString(),
        duration: durationInHours,
        total_price: totalAmount
      };

      // Validate data before sending
      logger.debug('Booking data validation:', {
        pickupDateTime: pickupDateTime.toISOString(),
        dropoffDateTime: dropoffDateTime.toISOString(),
        durationInHours,
        basePrice,
        gst,
        serviceFee,
        totalAmount,
        bookingDetails,
        bookingData: JSON.stringify(bookingData)
      });

      const bookingResponse = await fetch('/api/user/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      const bookingResult = await bookingResponse.json();
      logger.debug('Booking created:', bookingResult);

      if (!bookingResult.success || !bookingResult.data?.booking?.id) {
        throw new Error('Failed to create booking');
      }

      const booking = bookingResult.data.booking;

      // Create payment order
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.id,
          amount: totalAmount
        }),
      });

      const orderData = await orderResponse.json();
      logger.debug('Payment order created:', orderData);

      if (!orderData.success || !orderData.data) {
        throw new Error(orderData.error || 'Failed to create payment order');
      }

      // Initialize Razorpay
      const options = {
        key: orderData.data.key,
        amount: orderData.data.amount,
        currency: orderData.data.currency,
        name: 'OnnRides',
        description: `Booking for ${bookingDetails.vehicleName}`,
        order_id: orderData.data.orderId,
        prefill: {
          name: session?.user?.name || '',
          email: session?.user?.email || '',
        },
        notes: {
          booking_id: booking.id,
          vehicle_name: bookingDetails.vehicleName
        },
        theme: {
          color: '#f26e24'
        },
        handler: async function(response: any) {
          try {
            logger.debug('Payment successful:', {
              ...response,
              razorpay_payment_id: '***',
              razorpay_signature: '***'
            });

            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                bookingId: booking.id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            toast.success('Payment successful!');
            router.push('/bookings');
          } catch (error) {
            logger.error('Payment verification error:', error);
            toast.error('Payment verification failed. Please contact support.');
          }
        }
      };

      const razorpay = new window.Razorpay(options);
      razorpay.on('payment.failed', function(response: any) {
        logger.error('Payment failed:', response.error);
        toast.error('Payment failed. Please try again.');
      });

      razorpay.open();
    } catch (error) {
      logger.error('Payment process error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !bookingDetails) return null

  // Format dates and times
  const formatTimeToAMPM = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours, 10)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  // Calculate base price using the same logic as vehicle card
  const pickupDateTime = new Date(`${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`);
  const dropoffDateTime = new Date(`${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`);
  
  const basePrice = calculateBookingPrice(
    {
      price_per_day: bookingDetails.pricePerHour,
      price_12hrs: bookingDetails.pricePerHour * 12,
      price_24hrs: bookingDetails.pricePerHour * 24,
      price_7days: bookingDetails.pricePerHour * 24 * 7,
      price_15days: bookingDetails.pricePerHour * 24 * 15,
      price_30days: bookingDetails.pricePerHour * 24 * 30,
      min_booking_hours: 5
    },
    pickupDateTime,
    dropoffDateTime
  );

  // Calculate taxes and fees
  const gst = basePrice * 0.18;
  const serviceFee = basePrice * 0.05;
  const totalDue = basePrice + gst + serviceFee;

  const formatLocation = (location: string) => {
    try {
      // First, try to decode any URI encoded components
      const decodedLocation = decodeURIComponent(location);
      
      // Try to parse if it's a JSON string (might be nested)
      const cleanAndParse = (str: string): string[] => {
        try {
          // Remove extra backslashes and clean up the string
          const cleaned = str.replace(/\\\\/g, '\\')
                            .replace(/\\"/g, '"')
                            .replace(/[{}"]/g, '');
          
          // Split by comma and clean up each location
          return cleaned.split(',')
                       .map(loc => loc.trim())
                       .filter(Boolean)
                       .map(loc => loc.replace(/^["']|["']$/g, '')); // Remove quotes
        } catch {
          return [str];
        }
      };

      const locations = cleanAndParse(decodedLocation);
      return locations.join(', ');
    } catch (e) {
      // If all parsing fails, clean up the string manually
      return location.replace(/[{}"\\]/g, '').split(',')[0].trim();
    }
  };

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">SUMMARY</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column - Vehicle Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="relative h-64 md:h-80 w-full flex items-center justify-center bg-gray-100 rounded-lg mb-6">
              <div className="relative h-56 md:h-72 w-full">
                <Image
                  src={bookingDetails.vehicleImage}
                  alt={bookingDetails.vehicleName}
                  fill
                  className="object-contain p-4"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = '/placeholder-car.jpg';
                    logger.error('Failed to load image:', bookingDetails.vehicleImage);
                  }}
                />
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-4">{bookingDetails.vehicleName}</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between text-gray-600">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">Pickup</span>
                  <span>{formatTimeToAMPM(bookingDetails.pickupTime)}</span>
                  <span className="text-sm">{bookingDetails.pickupDate}</span>
                </div>
                <div className="text-gray-400">to</div>
                <div className="flex flex-col text-right">
                  <span className="font-medium text-gray-900">Drop-off</span>
                  <span>{formatTimeToAMPM(bookingDetails.dropoffTime)}</span>
                  <span className="text-sm">{bookingDetails.dropoffDate}</span>
                </div>
              </div>
              <div className="pt-4 border-t">
                <div className="text-gray-600">
                  <span className="font-medium">Location:</span>{' '}
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {formatLocation(bookingDetails?.location || '')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Billing Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-6">Billing Details</h2>
            
            {/* Apply Coupon */}
            <div className="mb-6">
              <p className="text-sm font-medium mb-2">Apply Coupon</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter coupon code"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
                <button className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors">
                  APPLY
                </button>
              </div>
            </div>

            {/* Booking Details */}
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Vehicle Rental Charges</span>
                <span className="font-medium">{formatCurrency(basePrice)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">GST (18%)</span>
                <span className="font-medium">{formatCurrency(gst)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Service Fee (5%)</span>
                <span className="font-medium">{formatCurrency(serviceFee)}</span>
              </div>
              <div className="border-t pt-4 flex justify-between items-center">
                <span className="font-semibold">Total Due</span>
                <span className="font-bold text-lg">{formatCurrency(totalDue)}</span>
              </div>
            </div>

            {/* Make Payment Button */}
            <button
              onClick={handleConfirmBooking}
              disabled={loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Make payment'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 