'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { calculateDuration, formatCurrency } from '@/lib/utils';
import { calculateRentalPrice } from '@/lib/utils/price';
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
        console.error('Error parsing pending payment:', error);
        localStorage.removeItem('pendingPayment');
      }
    }
  }, []);

  const handleProceedToPayment = async () => {
    try {
      if (!session?.user) {
        toast.error('Please sign in to continue');
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

      if (!createBookingResponse.ok) {
        throw new Error('Failed to create booking');
      }

      const data = await createBookingResponse.json();

      // Redirect to payment page
      router.push(`/payment?booking_id=${data.bookingId}`);
    } catch (error) {
      logger.error('Error processing booking:', error);
      toast.error('Failed to process booking');
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