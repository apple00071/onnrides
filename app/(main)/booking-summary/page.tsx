'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import Script from 'next/script'
import { formatCurrency, calculateBookingPrice } from '@/lib/utils'

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

  useEffect(() => {
    // Get booking details from URL params
    const details: BookingDetails = {
      id: searchParams.get('bookingId') || '',
      vehicleId: searchParams.get('vehicleId') || '',
      vehicleName: searchParams.get('vehicleName') || '',
      vehicleImage: (() => {
        const imageUrl = searchParams.get('vehicleImage');
        if (!imageUrl) return '/placeholder.png';
        try {
          return decodeURIComponent(imageUrl);
        } catch (e) {
          console.error('Failed to decode image URL:', e);
          return '/placeholder.png';
        }
      })(),
      pricePerHour: Number(searchParams.get('pricePerHour')) || 0,
      pickupDate: searchParams.get('pickupDate') || '',
      dropoffDate: searchParams.get('dropoffDate') || '',
      pickupTime: searchParams.get('pickupTime') || '',
      dropoffTime: searchParams.get('dropoffTime') || '',
      location: searchParams.get('location') || ''
    }

    console.log('Booking details:', details) // Debug log

    if (!details.vehicleId || !details.pickupDate || !details.dropoffDate) {
      toast.error('Missing booking details')
      router.push('/')
      return
    }

    setBookingDetails(details)
  }, [searchParams, router])

  const handleConfirmBooking = async () => {
    if (!user) {
      router.push('/auth/signin')
      return
    }

    if (!bookingDetails) return

    try {
      setLoading(true)

      // Check if Razorpay is loaded
      if (typeof window.Razorpay === 'undefined') {
        throw new Error('Payment system is not loaded. Please refresh the page.');
      }
      
      // Format dates properly
      const pickupDateTime = new Date(`${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`)
      const dropoffDateTime = new Date(`${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`)
      
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
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicle_id: bookingDetails.vehicleId,
          pickup_datetime: pickupDateTime.toISOString(),
          dropoff_datetime: dropoffDateTime.toISOString(),
          total_hours: Math.ceil((dropoffDateTime.getTime() - pickupDateTime.getTime()) / (1000 * 60 * 60)),
          total_price: totalAmount,
          location: bookingDetails.location
        }),
      });

      if (!bookingResponse.ok) {
        const error = await bookingResponse.json();
        throw new Error(error.message || 'Failed to create booking');
      }

      const { booking } = await bookingResponse.json();
      console.log('Booking created:', booking);

      // Create payment order
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: booking.id,
          amount: totalAmount, // Server will handle conversion to paise
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create payment order');
      }

      const orderData = await orderResponse.json();
      console.log('Payment order created:', orderData);

      // Initialize Razorpay
      const options = {
        key: orderData.key,
        amount: Math.round(totalAmount * 100), // Convert to paise here
        currency: orderData.currency,
        name: 'OnnRides',
        description: `Booking for ${bookingDetails.vehicleName}`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            console.log('Payment successful, verifying...', response);
            const verifyResponse = await fetch('/api/payments/verify', {
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

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            toast.success('Payment successful!');
            router.push('/bookings');
          } catch (error) {
            console.error('Payment verification error:', error);
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          email: user.email || '',
        },
        theme: {
          color: '#f26e24',
        },
        modal: {
          ondismiss: function() {
            setLoading(false);
          }
        }
      };

      console.log('Initializing Razorpay with options:', { ...options, key: '***' });
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error('Failed to initiate payment');
    } finally {
      setLoading(false)
    }
  }

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

  // Parse location
  const displayLocation = (() => {
    try {
      const parsed = JSON.parse(bookingDetails.location);
      return Array.isArray(parsed) ? parsed[0] : bookingDetails.location;
    } catch (e) {
      return bookingDetails.location.replace(/[\[\]'"]/g, '').trim();
    }
  })();

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
      />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[1fr_400px] gap-6">
          {/* Left Column - Summary */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-xl font-bold mb-6">SUMMARY</h1>
            
            <div className="grid md:grid-cols-[300px_1fr] gap-8">
              {/* Vehicle Image */}
              <div>
                <div className="relative aspect-[4/3] w-full max-w-[300px] rounded-lg overflow-hidden bg-gray-100">
                  <Image
                    src={bookingDetails.vehicleImage}
                    alt={`${bookingDetails.vehicleName || 'Vehicle'} image`}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, 300px"
                    onError={(e) => {
                      console.error('Image load error for:', bookingDetails.vehicleImage);
                      const img = e.target as HTMLImageElement;
                      img.src = '/placeholder.png';
                    }}
                  />
                </div>
              </div>

              {/* Vehicle Details */}
              <div>
                <h2 className="text-xl font-semibold mb-2">{bookingDetails.vehicleName}</h2>
                <p className="text-gray-600 mb-4">Car</p>

                <div className="flex items-center justify-between mb-4">
                  <div className="text-center">
                    <p className="text-base font-medium">{formatTimeToAMPM(bookingDetails.pickupTime)}</p>
                    <p className="text-sm text-gray-500">{bookingDetails.pickupDate}</p>
                  </div>
                  <div className="text-gray-400">to</div>
                  <div className="text-center">
                    <p className="text-base font-medium">{formatTimeToAMPM(bookingDetails.dropoffTime)}</p>
                    <p className="text-sm text-gray-500">{bookingDetails.dropoffDate}</p>
                  </div>
                </div>

                <div className="text-gray-600">
                  <p>{displayLocation}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Billing Details */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-6">Billing Details</h2>

            {/* Coupon Code */}
            <div className="mb-6">
              <p className="text-sm font-medium mb-2">Apply Coupon</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Coupon code"
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
                <button className="px-4 py-2 bg-black text-white rounded-md text-sm font-medium">
                  APPLY
                </button>
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">Vehicle Rental Charges</span>
                <span>{formatCurrency(basePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">GST (18%)</span>
                <span>{formatCurrency(gst)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Service Fee (5%)</span>
                <span>{formatCurrency(serviceFee)}</span>
              </div>
            </div>

            {/* Total */}
            <div className="flex justify-between items-center border-t pt-4 mb-6">
              <span className="text-lg font-bold">Total Due</span>
              <span className="text-lg font-bold">{formatCurrency(totalDue)}</span>
            </div>

            {/* Make Payment Button */}
            <button
              onClick={handleConfirmBooking}
              disabled={loading}
              className="w-full bg-yellow-400 text-black py-3 rounded-md font-medium hover:bg-yellow-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Make payment'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
} 