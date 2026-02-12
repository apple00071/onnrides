'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { initializeRazorpayPayment } from '@/app/(main)/providers/RazorpayProvider';
import logger from '@/lib/logger';
import { toast } from 'sonner';

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    const fetchBookingAndInitPayment = async () => {
      try {
        if (!bookingId) {
          logger.error('No booking ID provided');
          toast.error('Invalid booking details');
          return;
        }

        logger.debug('Fetching booking details for payment initialization', { bookingId });
        const response = await fetch(`/api/user/bookings/${bookingId}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          logger.error('Failed to fetch booking details:', data);
          toast.error('Failed to load booking details');
          return;
        }

        const { booking, razorpayKey } = data;

        if (!razorpayKey) {
          logger.error('Razorpay key not found');
          toast.error('Payment system configuration error');
          return;
        }

        logger.debug('Initializing payment with details:', {
          bookingId: booking.id,
          amount: booking.total_price,
          orderId: booking.payment_intent_id
        });

        try {
          await initializeRazorpayPayment({
            key: razorpayKey,
            amount: Math.round(booking.total_price * 100), // Convert to paise and ensure it's an integer
            currency: 'INR',
            orderId: booking.payment_intent_id,
            bookingId: booking.id,
            prefill: {
              name: booking.user_name,
              email: booking.user_email,
              contact: booking.user_phone
            }
          });
        } catch (error) {
          logger.error('Failed to initialize payment:', error);
          toast.error('Failed to initialize payment. Please try again.');
          window.location.href = `/payment-status?status=failed&bookingId=${bookingId}`;
        }
      } catch (error) {
        logger.error('Error in payment initialization:', error);
        toast.error('Failed to initialize payment. Please try again.');
        window.location.href = `/payment-status?status=failed&bookingId=${bookingId}`;
      }
    };

    fetchBookingAndInitPayment();
  }, [bookingId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Initializing Payment</h1>
          <p className="text-gray-600 mb-4">Please wait while we set up your payment...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        </div>
      </div>
    </div>
  );
} 