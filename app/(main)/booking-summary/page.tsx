'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { calculateRentalPrice, isWeekendIST } from '@/lib/utils/price';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { BookingSummary } from '@/components/bookings/BookingSummary';
import logger from '@/lib/logger';
import { initializeRazorpayPayment } from '@/app/(main)/providers/RazorpayProvider';
import { toIST, formatISOWithTZ } from '@/lib/utils/timezone';
import { formatRazorpayAmount } from '@/app/lib/razorpayAmount';
import { VehicleType, VehicleStatus, Vehicle, BookingSummaryDetails } from '@/app/types';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { parseImages, parseLocations } from '@/lib/utils/data-normalization';

interface PriceDetails {
  price_per_hour: number;
  price_7_days?: number;
  price_15_days?: number;
  price_30_days?: number;
}

function PendingPaymentAlert({ payment, onClose }: {
  payment: {
    order_id: string;
    timestamp: string;
  };
  onClose: () => void;
}) {
  return (
    <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4 rounded shadow-sm">
      <div className="flex justify-between items-start">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-orange-700">
              You have a pending payment from {new Date(payment.timestamp).toLocaleTimeString()}.
              If you just made a payment, please wait a few minutes or contact support before trying again.
            </p>
          </div>
        </div>
        <button onClick={onClose} className="text-orange-400 hover:text-orange-500">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export default function BookingSummaryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const [vehicleDetails, setVehicleDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingVehicle, setIsLoadingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingSummaryDetails | null>(null);
  const [imageUrl, setVehicleImageUrl] = useState<string>('');
  const [pendingPayment, setPendingPayment] = useState<{ order_id: string, timestamp: string } | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string, discountAmount: number } | null>(null);

  // Consolidated data loading
  useEffect(() => {
    const vehicleId = searchParams.get('vehicleId');
    if (!vehicleId) {
      router.push('/vehicles');
      return;
    }

    // 1. Initial load from search params
    const vehicleName = searchParams.get('vehicleName') || '';
    const location = searchParams.get('location') || '';
    const urlImage = searchParams.get('vehicleImage') || '';

    const initialBooking = {
      vehicleId,
      vehicleName,
      location,
      pickupDate: searchParams.get('pickupDate') || '',
      pickupTime: searchParams.get('pickupTime') || '',
      dropoffDate: searchParams.get('dropoffDate') || '',
      dropoffTime: searchParams.get('dropoffTime') || '',
      pricePerHour: Number(searchParams.get('pricePerHour')) || 0,
      price7Days: Number(searchParams.get('price7Days')) || 0,
      price15Days: Number(searchParams.get('price15Days')) || 0,
      price30Days: Number(searchParams.get('price30Days')) || 0,
      vehicle: {
        name: vehicleName,
        images: urlImage,
        location: location
      }
    };

    setBookingDetails(initialBooking);
    if (urlImage) setVehicleImageUrl(urlImage);

    // 2. Fetch full details from API
    const fetchFullDetails = async () => {
      setIsLoadingVehicle(true);
      try {
        const response = await fetch(`/api/vehicles/${vehicleId}`);
        if (!response.ok) throw new Error('Failed to fetch vehicle details');

        const data = await response.json();
        const images = parseImages(data.images);
        const locations = parseLocations(data.location);

        const normalizedVehicle = {
          ...data,
          images,
          location: locations[0] || locations
        };

        setVehicleDetails(normalizedVehicle);
        if (images.length > 0) {
          setVehicleImageUrl(images[0]);
        }
      } catch (error) {
        logger.error('Error fetching vehicle details:', error);
      } finally {
        setIsLoadingVehicle(false);
        setIsLoading(false);
      }
    };

    fetchFullDetails();
  }, [searchParams, router]);

  useEffect(() => {
    // Check for pending payment in localStorage
    const storedPayment = localStorage.getItem('pendingPayment');
    if (storedPayment) {
      try {
        const payment = JSON.parse(storedPayment);
        const paymentTime = new Date(payment.timestamp).getTime();
        const now = new Date().getTime();
        const hoursSincePayment = (now - paymentTime) / (1000 * 60 * 60);

        if (hoursSincePayment < 24) {
          setPendingPayment(payment);
        } else {
          localStorage.removeItem('pendingPayment');
        }
      } catch (error) {
        localStorage.removeItem('pendingPayment');
      }
    }
  }, []);

  const totalAmount = useMemo(() => {
    if (!bookingDetails) return 0;
    const start = new Date(`${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`);
    const end = new Date(`${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`);
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    const isWeekend = isWeekendIST(start);

    return calculateRentalPrice({
      price_per_hour: bookingDetails.pricePerHour,
      price_7_days: bookingDetails.price7Days,
      price_15_days: bookingDetails.price15Days,
      price_30_days: bookingDetails.price30Days
    }, duration, isWeekend);
  }, [bookingDetails]);

  const handleApplyCoupon = async (code: string) => {
    try {
      const response = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          totalAmount // subtotal before coupon
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || 'Invalid coupon code');
        setAppliedCoupon(null);
        return;
      }

      setAppliedCoupon({
        code: result.coupon.code,
        discountAmount: result.coupon.discountAmount
      });
      toast.success('Coupon applied successfully!');
    } catch (error) {
      logger.error('Error validating coupon:', error);
      toast.error('Failed to validate coupon');
    }
  };

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

      const pickupDateTime = new Date(`${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`);
      const dropoffDateTime = new Date(`${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`);

      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicleId: bookingDetails.vehicleId,
          pickupDate: pickupDateTime.toISOString(),
          dropoffDate: dropoffDateTime.toISOString(),
          location: bookingDetails.location,
          customerName: session.user.name,
          customerEmail: session.user.email,
          customerPhone: (session.user as any)?.phone || '',
          couponCode: appliedCoupon?.code || null // Added couponCode
        }),
      });

      if (!bookingResponse.ok) {
        const errorData = await bookingResponse.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const bookingResult = await bookingResponse.json();
      const paymentData = bookingResult.data || bookingResult;

      // Initialize Razorpay
      await initializeRazorpayPayment({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: Math.round(paymentData.razorpayAmount * 100),
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

  if (isLoading && !bookingDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!bookingDetails) return null;

  return (
    <div className="min-h-screen bg-gray-50 pb-12 pt-16">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center uppercase tracking-tight">Booking Summary</h1>

        {pendingPayment && (
          <PendingPaymentAlert
            payment={pendingPayment}
            onClose={() => setPendingPayment(null)}
          />
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
          <BookingSummary
            vehicle={vehicleDetails || {
              ...bookingDetails.vehicle,
              images: [imageUrl]
            }}
            startDate={new Date(`${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`).toISOString()}
            endDate={new Date(`${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`).toISOString()}
            totalAmount={totalAmount}
            couponCode={appliedCoupon?.code}
            couponDiscount={appliedCoupon?.discountAmount}
            onCouponApply={handleApplyCoupon}
            onPaymentClick={handleProceedToPayment}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}