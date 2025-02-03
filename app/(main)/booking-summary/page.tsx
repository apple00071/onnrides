'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { calculateDuration, formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface BookingSummary {
  vehicleId: string;
  vehicleName: string;
  vehicleImage: string;
  location: string;
  pickupDate: string;
  pickupTime: string;
  dropoffDate: string;
  dropoffTime: string;
  pricePerHour: number;
}

export default function BookingSummaryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [bookingDetails, setBookingDetails] = useState<BookingSummary | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const details: BookingSummary = {
      vehicleId: searchParams.get('vehicleId') || '',
      vehicleName: searchParams.get('vehicleName') || '',
      vehicleImage: searchParams.get('vehicleImage') || '/placeholder-vehicle.jpg',
      location: searchParams.get('location') || '',
      pickupDate: searchParams.get('pickupDate') || '',
      pickupTime: searchParams.get('pickupTime') || '',
      dropoffDate: searchParams.get('dropoffDate') || '',
      dropoffTime: searchParams.get('dropoffTime') || '',
      pricePerHour: Number(searchParams.get('pricePerHour')) || 0,
    };

    if (!details.vehicleId || !details.pickupDate || !details.dropoffDate) {
      toast.error('Missing booking details');
      router.push('/vehicles');
      return;
    }

    setBookingDetails(details);
  }, [searchParams, router]);

  if (!bookingDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pickupDateTime = new Date(`${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`);
  const dropoffDateTime = new Date(`${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`);
  const duration = calculateDuration(pickupDateTime, dropoffDateTime);
  
  // Calculate base price with minimum duration rules
  const isWeekend = pickupDateTime.getDay() === 0 || pickupDateTime.getDay() === 6;
  const minimumHours = isWeekend ? 24 : 12;
  const effectiveDuration = Math.max(duration, minimumHours);
  const basePrice = Math.round(effectiveDuration * bookingDetails.pricePerHour);
  
  // Calculate additional charges
  const gst = Math.round(basePrice * 0.18);
  const serviceFee = Math.round(basePrice * 0.05);
  const totalPrice = basePrice + gst + serviceFee;

  const handleConfirmBooking = async () => {
    try {
      setIsLoading(true);
      
      // Log the request payload
      const payload = {
        amount: totalPrice, // This is already in rupees
        bookingDetails: {
          vehicleId: bookingDetails.vehicleId,
          location: bookingDetails.location,
          pickupDateTime: pickupDateTime.toISOString(),
          dropoffDateTime: dropoffDateTime.toISOString(),
          duration: effectiveDuration,
          basePrice,
          gst,
          serviceFee,
          totalPrice,
        },
      };
      
      console.log('Creating booking with payload:', payload);

      // Create order
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Failed to create booking:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData?.error || 'Failed to create booking');
      }

      const data = await response.json();
      console.log('Booking created successfully:', data);
      
      // Get the base URL based on environment
      const baseURL = process.env.NEXT_PUBLIC_VERCEL_URL 
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      
      // Initialize Razorpay
      const options = {
        key: data.data.key,
        amount: data.data.amount,
        currency: data.data.currency,
        name: 'OnnRides',
        description: `Booking for ${bookingDetails.vehicleName}`,
        order_id: data.data.orderId,
        prefill: {
          name: 'User Name',
          email: 'user@example.com',
          contact: '9999999999',
        },
        config: {
          display: {
            blocks: {
              utib: {
                name: 'Pay using Bank Account or UPI',
                instruments: [
                  {
                    method: 'upi'
                  },
                  {
                    method: 'netbanking'
                  },
                  {
                    method: 'card'
                  }
                ]
              }
            },
            sequence: ['block.utib'],
            preferences: {
              show_default_blocks: false
            }
          }
        },
        modal: {
          confirm_close: true,
          ondismiss: function() {
            setIsLoading(false);
            toast.error('Payment cancelled. Please try again.');
          }
        },
        handler: async function(response: any) {
          try {
            console.log('Payment successful, verifying...', response);
            
            // Add retry logic for payment verification
            const maxRetries = 3;
            let retryCount = 0;
            let verifySuccess = false;

            const verifyPayment = async () => {
              const verifyResponse = await fetch(`${baseURL}/api/payment/verify`, {
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
                throw new Error('Verification failed');
              }

              return await verifyResponse.json();
            };

            while (retryCount < maxRetries && !verifySuccess) {
              try {
                toast.loading('Verifying payment...');
                const verifyResult = await verifyPayment();
                
                if (verifyResult.success) {
                  verifySuccess = true;
                  toast.success('Booking confirmed! Redirecting to bookings page...');
                  
                  // Add a small delay to ensure the toast is visible
                  setTimeout(() => {
                    window.location.href = '/bookings';
                  }, 2000);
                  break;
                }
              } catch (error) {
                console.error('Verification attempt failed:', {
                  attempt: retryCount + 1,
                  error
                });
                
                if (retryCount === maxRetries - 1) {
                  // On final retry, show error and save payment info
                  toast.error(
                    'Payment successful but verification failed. ' +
                    'Please save your payment ID and contact support: ' + 
                    response.razorpay_payment_id
                  );
                  break;
                }
                
                retryCount++;
                await new Promise(resolve => setTimeout(resolve, 2000));
              }
            }

            if (!verifySuccess) {
              console.error('Payment verification failed after all retries');
              // Store payment info in localStorage for recovery
              localStorage.setItem('pendingPayment', JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                timestamp: new Date().toISOString()
              }));
            }
          } catch (error) {
            console.error('Error in payment verification:', error);
            toast.error(
              'Payment verification failed. Please save your payment ID and contact support. ' +
              'Payment ID: ' + response.razorpay_payment_id
            );
          } finally {
            setIsLoading(false);
          }
        },
        theme: {
          color: '#f26e24',
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      console.error('Error in handleConfirmBooking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
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
              />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-4">{bookingDetails.vehicleName}</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between text-gray-600">
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">Pickup</span>
                <span>{pickupDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-sm">{pickupDateTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="text-gray-400">to</div>
              <div className="flex flex-col text-right">
                <span className="font-medium text-gray-900">Drop-off</span>
                <span>{dropoffDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-sm">{dropoffDateTime.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
            <div className="pt-4 border-t">
              <div className="text-gray-600">
                <span className="font-medium">Location:</span>{' '}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {bookingDetails.location}
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
              <span className="font-bold text-lg">{formatCurrency(totalPrice)}</span>
            </div>
          </div>

          {/* Make Payment Button */}
          <button
            onClick={handleConfirmBooking}
            disabled={isLoading}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing...' : 'Make payment'}
          </button>
        </div>
      </div>
    </div>
  );
} 