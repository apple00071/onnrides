'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function PaymentStatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const orderId = searchParams.get('order_id');
        const orderToken = searchParams.get('order_token');

        if (!orderId || !orderToken) {
          toast.error('Invalid payment response');
          router.push('/');
          return;
        }

        // Get stored booking info
        const storedBooking = localStorage.getItem('pendingBooking');
        if (!storedBooking) {
          toast.error('No booking information found');
          router.push('/');
          return;
        }

        const bookingInfo = JSON.parse(storedBooking);

        // Verify payment with backend
        const response = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order_id: orderId,
            order_token: orderToken,
            booking_id: bookingInfo.booking_id
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          localStorage.removeItem('pendingBooking');
          toast.success('Payment successful! Redirecting to bookings...');
          setTimeout(() => {
            router.push('/bookings');
          }, 2000);
        } else {
          throw new Error(data.error || 'Payment verification failed');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        toast.error('Failed to verify payment. Please contact support.');
        setTimeout(() => {
          router.push('/bookings');
        }, 3000);
      } finally {
        setIsVerifying(false);
      }
    };

    verifyPayment();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verifying Payment
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Please wait while we verify your payment...
          </p>
        </div>
        {isVerifying && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500"></div>
          </div>
        )}
      </div>
    </div>
  );
} 