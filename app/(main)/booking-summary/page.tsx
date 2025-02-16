'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { calculateDuration, formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { BookingSummary } from '@/components/bookings/BookingSummary';
import logger from '@/lib/logger';

interface BookingSummaryDetails {
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

function PendingPaymentAlert({ payment, onClose }: { 
  payment: { 
    order_id: string;
    timestamp: string;
  }; 
  onClose: () => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-medium text-yellow-800">
            Unverified Payment Found
          </p>
          <p className="mt-1 text-sm text-yellow-700">
            Order ID: {payment.order_id}
          </p>
          <p className="mt-1 text-xs text-yellow-600">
            Time: {new Date(payment.timestamp).toLocaleString()}
          </p>
          <div className="mt-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(payment.order_id);
                toast.success('Order ID copied to clipboard');
              }}
              className="text-sm font-medium text-yellow-800 hover:text-yellow-700"
            >
              Copy Order ID
            </button>
          </div>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={onClose}
            className="bg-yellow-50 rounded-md inline-flex text-yellow-400 hover:text-yellow-500 focus:outline-none"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Create a single notification manager
function showNotification(message: string, type: 'success' | 'error' = 'error', options?: any) {
  // Clear any existing notifications first
  toast.dismiss();
  // Show new notification
  if (type === 'success') {
    toast.success(message, options);
  } else {
    toast.error(message, options);
  }
}

export default function BookingSummaryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [bookingDetails, setBookingDetails] = useState<BookingSummaryDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<any>(null);

  useEffect(() => {
    const vehicleId = searchParams.get('vehicleId');
    const pickupDate = searchParams.get('pickupDate');
    const dropoffDate = searchParams.get('dropoffDate');

    if (!vehicleId || !pickupDate || !dropoffDate) {
      router.push('/vehicles');
      return;
    }
  }, [searchParams, router]);

  useEffect(() => {
    const details: BookingSummaryDetails = {
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

    setBookingDetails(details);
  }, [searchParams, router]);

  useEffect(() => {
    // Check for pending payment in localStorage
    const storedPayment = localStorage.getItem('pendingPayment');
    if (storedPayment) {
      try {
        const payment = JSON.parse(storedPayment);
        // Only show payments from the last 24 hours
        const paymentTime = new Date(payment.timestamp).getTime();
        const now = new Date().getTime();
        const hoursSincePayment = (now - paymentTime) / (1000 * 60 * 60);
        
        if (hoursSincePayment < 24) {
          setPendingPayment(payment);
        } else {
          // Remove old pending payments
          localStorage.removeItem('pendingPayment');
        }
      } catch (error) {
        console.error('Error parsing pending payment:', error);
        localStorage.removeItem('pendingPayment');
      }
    }
  }, []);

  const handleProceedToPayment = async () => {
    try {
      if (!session?.user) {
        showNotification('Please sign in to continue');
        return;
      }

      if (!bookingDetails) {
        router.push('/vehicles');
        return;
      }

      setIsLoading(true);

      const pickupDateTime = new Date(`${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`);
      const dropoffDateTime = new Date(`${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`);
      const duration = calculateDuration(pickupDateTime, dropoffDateTime);
      
      // Calculate base price with minimum duration rules
      const isWeekend = pickupDateTime.getDay() === 0 || pickupDateTime.getDay() === 6;
      const minimumHours = isWeekend ? 24 : 12;
      const effectiveDuration = Math.max(duration, minimumHours);
      const basePrice = effectiveDuration * bookingDetails.pricePerHour;
      
      // Calculate additional charges
      const gst = basePrice * 0.18;
      const serviceFee = basePrice * 0.05;
      const totalPrice = basePrice + gst + serviceFee;

      // Create booking
      const createBookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vehicleId: bookingDetails.vehicleId,
          pickupDate: `${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`,
          dropoffDate: `${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`,
          location: bookingDetails.location,
          customerDetails: {
            name: session.user.name || 'Guest',
            email: session.user.email || '',
            phone: (session.user as any)?.phone || ''
          },
          totalPrice
        })
      });

      const responseText = await createBookingResponse.text();

      if (!createBookingResponse.ok) {
        let errorData;
        try {
          errorData = JSON.parse(responseText);
        } catch (e) {
          throw new Error('Invalid response from server');
        }
        throw new Error(errorData.details || errorData.error || 'Failed to create booking');
      }

      const response = JSON.parse(responseText);

      if (!response.success || !response.data) {
        throw new Error('Invalid response from server');
      }

      const { data } = response;
      
      // Store order info
      const orderInfo = {
        order_id: data.orderId,
        booking_id: data.bookingId,
        amount: data.amount,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('pendingPayment', JSON.stringify(orderInfo));

      // Initialize Razorpay payment
      if (!(window as any).Razorpay) {
        throw new Error('Payment system is not available');
      }

      const razorpay = new (window as any).Razorpay({
        key: data.key,
        amount: data.amount,
        currency: data.currency,
        name: "OnnRides",
        description: "Vehicle Rental Payment",
        order_id: data.orderId,
        handler: async function (response: any) {
          try {
            // Store payment details in case verification fails
            const paymentDetails = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              booking_id: data.bookingId,
              amount: data.amount,
              timestamp: new Date().toISOString()
            };
            localStorage.setItem('pendingPayment', JSON.stringify(paymentDetails));

            // Verify payment
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                booking_id: data.bookingId,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature
              }),
            });

            const verifyData = await verifyResponse.json();

            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Payment verification failed');
            }

            // Clear pending payment from localStorage
            localStorage.removeItem('pendingPayment');
            
            showNotification('Payment successful!', 'success');
            
            // Use the redirect URL from the response if available
            const redirectUrl = verifyData.data?.redirect_url || `/bookings?success=true&booking_id=${data.bookingId}`;
            router.push(redirectUrl);
            setIsLoading(false); // Reset loading state after successful redirect
          } catch (error) {
            console.error('Payment verification error:', error);
            setIsLoading(false); // Reset loading state on error
            
            // Show error with support team contact message
            showNotification(
              'Payment Verification Failed',
              'error',
              {
                description: (
                  <div className="flex flex-col gap-4">
                    <div className="text-red-800">
                      <p className="font-medium">Your payment may have been processed but verification failed.</p>
                      <p className="mt-1">Please contact our support team with the following details:</p>
                      <ul className="mt-2 list-disc list-inside text-sm">
                        <li>Order ID: {response.razorpay_order_id}</li>
                        <li>Payment ID: {response.razorpay_payment_id}</li>
                        <li>Booking ID: {data.bookingId}</li>
                      </ul>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => {
                          const supportInfo = `Order ID: ${response.razorpay_order_id}\nPayment ID: ${response.razorpay_payment_id}\nBooking ID: ${data.bookingId}`;
                          navigator.clipboard.writeText(supportInfo);
                          toast.success('Payment details copied to clipboard');
                        }}
                        className="bg-gray-100 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors text-sm"
                      >
                        Copy Payment Details
                      </button>
                      <a
                        href={`mailto:support@onnrides.com?subject=Payment%20Verification%20Failed&body=Order%20ID:%20${response.razorpay_order_id}%0APayment%20ID:%20${response.razorpay_payment_id}%0ABooking%20ID:%20${data.bookingId}`}
                        className="bg-orange-500 text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors text-center"
                      >
                        Contact Support
                      </a>
                    </div>
                  </div>
                ),
                duration: 0 // Keep the notification until user dismisses it
              }
            );
          }
        },
        prefill: {
          name: session.user.name || '',
          email: session.user.email || '',
          contact: (session.user as any)?.phone || ''
        },
        theme: {
          color: "#f97316"
        },
        modal: {
          ondismiss: function() {
            setIsLoading(false); // Reset loading state when modal is dismissed
          }
        }
      });

      razorpay.open();
    } catch (error) {
      logger.error('Error processing booking:', error);
      showNotification(error instanceof Error ? error.message : 'Failed to process booking');
    } finally {
      setIsLoading(false);
    }
  };

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
  const basePrice = effectiveDuration * bookingDetails.pricePerHour;
  
  // Calculate additional charges
  const gst = basePrice * 0.18;
  const serviceFee = basePrice * 0.05;
  const totalPrice = basePrice + gst + serviceFee;

  const booking = {
    vehicle: {
      name: bookingDetails.vehicleName,
      image: bookingDetails.vehicleImage,
      location: bookingDetails.location,
    },
    start_date: `${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`,
    end_date: `${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`,
    duration: effectiveDuration,
    total_price: totalPrice,
    base_price: basePrice,
    gst: gst,
    service_fee: serviceFee,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 relative">
      {pendingPayment && !isLoading && (
        <PendingPaymentAlert
          payment={pendingPayment}
          onClose={() => {
            setPendingPayment(null);
            localStorage.removeItem('pendingPayment');
          }}
        />
      )}
      
      <BookingSummary
        booking={booking}
        onProceedToPayment={handleProceedToPayment}
      />
    </div>
  );
} 