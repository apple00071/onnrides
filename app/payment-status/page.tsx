'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import logger from '@/lib/logger';

type VerificationStatus = 'idle' | 'verifying' | 'success' | 'error';

export default function PaymentStatus() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const hasAttemptedVerification = useRef(false);

  // Create a memoized verification function
  const verifyPayment = useCallback(async () => {
    // Prevent multiple verification attempts
    if (hasAttemptedVerification.current) {
      logger.debug('Verification already attempted, skipping...');
      return;
    }
    hasAttemptedVerification.current = true;

    try {
      // Get payment reference from URL
      const reference = searchParams.get('reference');
      logger.debug('Payment reference from URL:', reference);
      
      // Try to get order ID from localStorage
      const pendingPayment = localStorage.getItem('pendingPayment');
      logger.debug('Raw pendingPayment from localStorage:', pendingPayment);
      
      let orderId: string | undefined;
      let bookingId: string | undefined;

      if (pendingPayment) {
        try {
          const paymentData = JSON.parse(pendingPayment);
          logger.debug('Parsed payment data:', paymentData);
          orderId = paymentData.order_id;
          bookingId = paymentData.booking_id;
          logger.debug('Extracted order_id:', orderId);
          logger.debug('Extracted booking_id:', bookingId);
        } catch (e) {
          logger.error('Failed to parse pendingPayment:', e);
        }
      }
      
      if (!reference || !orderId) {
        logger.error('Missing payment data:', { reference, orderId, bookingId });
        setVerificationStatus('error');
        toast.error('Missing payment information');
        return;
      }

      logger.debug('Sending verification request with:', {
        payment_reference: reference,
        order_id: orderId,
        booking_id: bookingId
      });

      setVerificationStatus('verifying');
      
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment_reference: reference,
          order_id: orderId,
          booking_id: bookingId
        }),
      });

      logger.debug('Verification response status:', response.status);
      const data = await response.json();
      logger.debug('Verification response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Payment verification failed');
      }

      setVerificationStatus('success');
      toast.success('Payment verified successfully');
      
      // Clear stored payment data
      logger.debug('Clearing pendingPayment from localStorage');
      localStorage.removeItem('pendingPayment');
      
      // Redirect to booking details after a short delay
      logger.debug('Scheduling redirect to:', `/bookings/${orderId}`);
      setTimeout(() => {
        router.push(`/bookings/${orderId}`);
      }, 2000);

    } catch (error) {
      logger.error('Payment verification error:', error);
      setVerificationStatus('error');
      toast.error(error instanceof Error ? error.message : 'Payment verification failed');
    }
  }, [searchParams, router]);

  useEffect(() => {
    logger.debug('Payment status effect running. Session status:', sessionStatus);
    logger.debug('Current verification status:', verificationStatus);
    
    if (sessionStatus === 'authenticated' && verificationStatus === 'idle') {
      logger.debug('Starting payment verification...');
      verifyPayment();
    } else if (sessionStatus === 'unauthenticated') {
      logger.debug('User not authenticated, redirecting to signin...');
      toast.error('Please sign in to continue');
      router.push('/auth/signin');
    }
  }, [sessionStatus, verificationStatus, verifyPayment, router]);

  if (sessionStatus === 'loading' || verificationStatus === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-lg">Verifying payment...</p>
        <p className="mt-2 text-sm text-gray-600">Reference: {searchParams.get('reference')}</p>
      </div>
    );
  }

  if (verificationStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-red-600">Payment Verification Failed</h1>
        <p className="mt-4">Please contact support if you believe this is an error.</p>
        <p className="mt-2 text-sm text-gray-600">Reference ID: {searchParams.get('reference')}</p>
        <button 
          onClick={() => {
            logger.debug('Current localStorage pendingPayment:', localStorage.getItem('pendingPayment'));
          }}
          className="mt-4 text-sm text-blue-600 hover:underline"
        >
          Check Payment Data
        </button>
      </div>
    );
  }

  if (verificationStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold text-green-600">Payment Successful!</h1>
        <p className="mt-4">Redirecting to your booking details...</p>
      </div>
    );
  }

  return null;
} 