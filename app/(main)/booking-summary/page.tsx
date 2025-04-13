'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { calculateDuration } from '@/lib/utils/duration-calculator';
import { calculateRentalPrice } from '@/lib/utils/price';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { BookingSummary } from '@/components/bookings/BookingSummary';
import logger from '@/lib/logger';
import { initializeRazorpayPayment } from '@/app/providers/RazorpayProvider';
import { toIST, formatISOWithTZ, isWeekendIST } from '@/lib/utils/timezone';
import { formatRazorpayAmount } from '@/app/lib/razorpayAmount';

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

const IST_TIMEZONE = 'Asia/Kolkata';

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
  }, [searchParams]);

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
        logger.error('Error parsing pending payment:', error);
        localStorage.removeItem('pendingPayment');
      }
    }
  }, []);

  const handleProceedToPayment = async () => {
    setIsLoading(true);
    try {
      if (!session?.user) {
        toast.error('Please sign in to continue');
        return;
      }

      if (!bookingDetails) {
        router.push('/vehicles');
        return;
      }

      // Log the raw time data selected by the user
      console.log('Raw booking time data:', {
        pickupDate: bookingDetails.pickupDate,
        pickupTime: bookingDetails.pickupTime,
        dropoffDate: bookingDetails.dropoffDate,
        dropoffTime: bookingDetails.dropoffTime,
      });

      // Parse the dates preserving the exact time the user selected
      // We DON'T need to apply time zone conversion here since these are the actual times the user wants
      const pickupDateTime = new Date(`${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`);
      const dropoffDateTime = new Date(`${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`);

      // Calculate duration only if both dates are valid
      let duration = 0;
      if (!isNaN(pickupDateTime.getTime()) && !isNaN(dropoffDateTime.getTime())) {
        duration = calculateDuration(pickupDateTime, dropoffDateTime);
      } else {
        logger.warn('Invalid dates for duration calculation', {
          pickupDateTime,
          dropoffDateTime
        });
        throw new Error('Invalid booking dates');
      }
      
      // Check if pickup date is a weekend
      const isWeekend = pickupDateTime.getDay() === 0 || pickupDateTime.getDay() === 6;
      
      // Create a pricing object with the pricing details
      const pricing = {
        price_per_hour: bookingDetails.pricePerHour,
        price_7_days: Number(searchParams.get('price7Days')) || 0,
        price_15_days: Number(searchParams.get('price15Days')) || 0,
        price_30_days: Number(searchParams.get('price30Days')) || 0
      };
      
      // Calculate total price using the special pricing logic
      const basePrice = calculateRentalPrice(pricing, duration, isWeekend);
      
      // Calculate additional charges
      const gst = basePrice * 0.18;
      const serviceFee = basePrice * 0.05;
      const totalPrice = basePrice + gst + serviceFee;

      // Calculate advance payment (exactly 5% of total price)
      const advancePayment = Math.round(totalPrice * 0.05);
      
      logger.info('Payment calculation:', {
        basePrice,
        gst,
        serviceFee,
        totalPrice,
        advancePayment,
        advancePaymentPercentage: `${(advancePayment / totalPrice * 100).toFixed(1)}%`
      });

      // IMPORTANT FIX: Send ISO strings WITHOUT timezone indicators
      // Just use the raw date objects' ISO strings - the API will handle the timezone conversion
      const pickupDateISO = pickupDateTime.toISOString();
      const dropoffDateISO = dropoffDateTime.toISOString();

      // Debug logging for date information
      logger.info('Booking dates:', {
        original: {
          pickupDateStr: bookingDetails.pickupDate,
          pickupTimeStr: bookingDetails.pickupTime,
          dropoffDateStr: bookingDetails.dropoffDate,
          dropoffTimeStr: bookingDetails.dropoffTime,
        },
        parsed: {
          pickupTime: `${pickupDateTime.getHours()}:${pickupDateTime.getMinutes()}`,
          dropoffTime: `${dropoffDateTime.getHours()}:${dropoffDateTime.getMinutes()}`,
          pickupDate: pickupDateTime.toDateString(),
          dropoffDate: dropoffDateTime.toDateString(),
        },
        formatted: {
          pickupDateISO,
          dropoffDateISO,
          pickupHours: pickupDateTime.getHours(),
          pickupMinutes: pickupDateTime.getMinutes(),
          dropoffHours: dropoffDateTime.getHours(),
          dropoffMinutes: dropoffDateTime.getMinutes(),
        }
      });

      // Create booking
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: bookingDetails.vehicleId,
          pickupDate: pickupDateISO,  // Changed from pickupDateIST to pickupDateISO
          dropoffDate: dropoffDateISO, // Changed from dropoffDateIST to dropoffDateISO
          location: bookingDetails.location,
          totalPrice: totalPrice,
          advancePayment: advancePayment,
          basePrice: basePrice,
          gst: gst,
          serviceFee: serviceFee,
          customerDetails: {
            name: session.user.name || 'Guest',
            email: session.user.email || '',
            phone: (session.user as any)?.phone || ''
          }
        }),
      });

      if (!bookingResponse.ok) {
        const errorData = await bookingResponse.json();
        logger.error('Booking creation failed:', { 
          status: bookingResponse.status,
          error: errorData 
        });
        
        // Create a more user-friendly error message
        let errorMessage = 'Failed to create booking';
        if (errorData?.error) {
          errorMessage = errorData.error;
        }
        if (errorData?.details) {
          // Try to parse the error details for more information
          try {
            const detailsObj = typeof errorData.details === 'string' && 
                              errorData.details.startsWith('{') ? 
                              JSON.parse(errorData.details) : null;
                              
            if (detailsObj?.message) {
              errorMessage = `${errorMessage}: ${detailsObj.message}`;
            } else if (typeof errorData.details === 'string') {
              errorMessage = `${errorMessage}: ${errorData.details}`;
            }
          } catch (e) {
            // If we can't parse it, just use the string
            if (typeof errorData.details === 'string') {
              errorMessage = `${errorMessage}: ${errorData.details}`;
            }
          }
        }
        
        throw new Error(errorMessage);
      }

      const bookingResult = await bookingResponse.json();
      logger.info('Booking response:', bookingResult);

      // Extract payment data from the response
      const paymentData = bookingResult.data || bookingResult;
      
      if (!paymentData.orderId || !paymentData.bookingId) {
        logger.error('Invalid payment data:', paymentData);
        throw new Error('Invalid payment data received');
      }

      // Log payment details before initializing
      logger.info('Initializing payment with data:', {
        orderId: paymentData.orderId,
        bookingId: paymentData.bookingId,
        originalAmount: advancePayment, // This is the INR amount (5% of total)
        razorpayAmount: paymentData.razorpayAmount, // This is the actual amount in INR
        razorpayAmountPaise: (paymentData.razorpayAmount * 100) // Convert to paise for debugging
      });

      // Need to display a toast if there's a minimum amount adjustment
      if (paymentData.razorpayAmount !== undefined && 
          paymentData.amount !== undefined && 
          paymentData.razorpayAmount !== paymentData.amount) {
        toast.custom(
          () => (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded shadow-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-orange-800">
                    Due to payment processor requirements, a minimum fee of ₹1 will be charged. Your actual advance amount is ₹{advancePayment}
                  </p>
                </div>
              </div>
            </div>
          ),
          { duration: 6000 }
        );
      }

      // We need to convert the amount to paise for Razorpay
      // This should be handled on the server, but we'll ensure it here as well
      const paymentAmountInPaise = Math.round(paymentData.razorpayAmount * 100);
      
      logger.info('Final payment amount calculation:', {
        originalAdvanceINR: advancePayment,
        razorpayAmountINR: paymentData.razorpayAmount,
        amountToSendToPaiseFE: paymentAmountInPaise
      });
      
      // Initialize Razorpay payment with the amount in paise
      await initializeRazorpayPayment({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: paymentAmountInPaise, // Amount in paise
        currency: 'INR',
        orderId: paymentData.orderId,
        bookingId: paymentData.bookingId,
        prefill: {
          name: session.user.name || undefined,
          email: session.user.email || undefined,
          contact: (session.user as any)?.phone || undefined
        }
      });

    } catch (error) {
      logger.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process payment');
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
  
  // Calculate base price with minimum duration rules and special pricing
  const isWeekend = pickupDateTime.getDay() === 0 || pickupDateTime.getDay() === 6;
  
  // Create a pricing object with the pricing details
  const pricing = {
    price_per_hour: bookingDetails.pricePerHour,
    price_7_days: Number(searchParams.get('price7Days')) || 0,
    price_15_days: Number(searchParams.get('price15Days')) || 0,
    price_30_days: Number(searchParams.get('price30Days')) || 0
  };
  
  // Calculate total price using the special pricing logic
  const basePrice = calculateRentalPrice(pricing, duration, isWeekend);
  
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
    duration: duration,
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