'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import logger from '@/lib/logger';

interface RetryPaymentPageProps {
  params: {
    bookingId: string;
  };
}

export default function RetryPaymentPage({ params }: RetryPaymentPageProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const { bookingId } = params;

  useEffect(() => {
    async function initializePayment() {
      try {
        if (sessionStatus === 'loading') return;

        if (!session?.user) {
          toast.error('Please sign in to retry payment');
          router.push('/auth/signin');
          return;
        }

        // Initialize new payment session
        const response = await fetch('/api/payments/initialize', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            booking_id: bookingId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to initialize payment');
        }

        // Redirect to payment page with new order details
        router.push(`/payment?booking_id=${bookingId}&order_id=${data.orderId}`);
      } catch (error) {
        logger.error('Error retrying payment:', error);
        toast.error('Failed to initialize payment. Please try again.');
        router.push('/bookings');
      } finally {
        setIsLoading(false);
      }
    }

    initializePayment();
  }, [bookingId, router, session, sessionStatus]);

  if (isLoading || sessionStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-semibold">Initializing Payment</h1>
        <p className="text-gray-600 mt-2">Please wait while we set up your payment...</p>
      </div>
    );
  }

  return null;
} 