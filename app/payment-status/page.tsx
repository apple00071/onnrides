'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

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
      console.log('Verification already attempted, skipping...');
      return;
    }
    hasAttemptedVerification.current = true;

    try {
      // Get payment reference from URL
      const reference = searchParams.get('reference');
      console.log('Payment reference from URL:', reference);
      
      // Try to get order ID from localStorage
      const pendingPayment = localStorage.getItem('pendingPayment');
      console.log('Raw pendingPayment from localStorage:', pendingPayment);
      
      let orderId: string | undefined;
      let bookingId: string | undefined;

      if (pendingPayment) {
        try {
          const paymentData = JSON.parse(pendingPayment);
          console.log('Parsed payment data:', paymentData);
          orderId = paymentData.order_id;
          bookingId = paymentData.booking_id;
          console.log('Extracted order_id:', orderId);
          console.log('Extracted booking_id:', bookingId);
        } catch (e) {
          console.error('Failed to parse pendingPayment:', e);
        }
      }
      
      if (!reference || !orderId) {
        console.error('Missing payment data:', { reference, orderId, bookingId });
        setVerificationStatus('error');
        toast.error('Missing payment information');
        return;
      }

      console.log('Sending verification request with:', {
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

      console.log('Verification response status:', response.status);
      const data = await response.json();
      console.log('Verification response data:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Payment verification failed');
      }

      setVerificationStatus('success');
      toast.success('Payment verified successfully');
      
      // Clear stored payment data
      console.log('Clearing pendingPayment from localStorage');
      localStorage.removeItem('pendingPayment');
      
      // Redirect to booking details after a short delay
      console.log('Scheduling redirect to:', `/bookings/${orderId}`);
      setTimeout(() => {
        router.push(`/bookings/${orderId}`);
      }, 2000);

    } catch (error) {
      console.error('Payment verification error:', error);
      setVerificationStatus('error');
      toast.error(error instanceof Error ? error.message : 'Payment verification failed');
    }
  }, [searchParams, router]);

  useEffect(() => {
    console.log('Payment status effect running. Session status:', sessionStatus);
    console.log('Current verification status:', verificationStatus);
    
    if (sessionStatus === 'authenticated' && verificationStatus === 'idle') {
      console.log('Starting payment verification...');
      verifyPayment();
    } else if (sessionStatus === 'unauthenticated') {
      console.log('User not authenticated, redirecting to signin...');
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
            console.log('Current localStorage pendingPayment:', localStorage.getItem('pendingPayment'));
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