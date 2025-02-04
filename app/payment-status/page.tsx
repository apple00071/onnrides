'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';

export default function PaymentStatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const reference = searchParams.get('reference');
        logger.info('Payment verification started:', { reference });

        if (!reference) {
          const error = 'Missing payment reference in URL';
          logger.error(error, { searchParams: Object.fromEntries(searchParams.entries()) });
          setError(error);
          setStatus('error');
          toast.error(error);
          setTimeout(() => router.push('/'), 3000);
          return;
        }

        // Verify payment with backend
        logger.info('Sending verification request to backend...');
        const response = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reference
          }),
        });

        const data = await response.json();
        logger.info('Backend verification response:', data);

        if (response.ok && data.success) {
          setStatus('success');
          toast.success('Payment successful! Redirecting to bookings...');
          setTimeout(() => {
            router.push('/bookings');
          }, 2000);
        } else {
          throw new Error(data.error || 'Payment verification failed');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Payment verification error:', error);
        setError(errorMessage);
        setStatus('error');
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          {status === 'loading' && (
            <>
              <div className="mx-auto w-24 h-24 mb-8">
                <div className="animate-spin rounded-full h-24 w-24 border-t-2 border-b-2 border-orange-500"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Verifying Payment
              </h2>
              <p className="text-gray-600">
                Please wait while we verify your payment...
              </p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto w-24 h-24 mb-8 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-16 h-16 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Successful
              </h2>
              <p className="text-gray-600 mb-4">
                Your booking has been confirmed!
              </p>
              <p className="text-sm text-green-500">
                Redirecting you to your bookings...
              </p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto w-24 h-24 mb-8 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="w-16 h-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Payment Verification Failed
              </h2>
              <p className="text-gray-600 mb-4">
                {error || 'An error occurred during payment verification'}
              </p>
              <p className="text-sm text-red-500">
                Redirecting you shortly...
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 