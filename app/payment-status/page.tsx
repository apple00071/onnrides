'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import logger from '@/lib/logger';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type PaymentStatus = 'loading' | 'verifying' | 'success' | 'failed' | 'cancelled';

export default function PaymentStatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const verificationStarted = useRef(false);

  // Get parameters from URL
  const status = searchParams.get('status');
  const bookingId = searchParams.get('booking_id') || searchParams.get('bookingId');
  const errorType = searchParams.get('error');
  const paymentId = searchParams.get('payment_id') || searchParams.get('paymentId');

  // Razorpay response tokens for verification
  const razorpay_payment_id = searchParams.get('razorpay_payment_id');
  const razorpay_order_id = searchParams.get('razorpay_order_id');
  const razorpay_signature = searchParams.get('razorpay_signature');

  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (sessionStatus === 'unauthenticated') {
      toast.error('Please sign in to view payment status');
      router.push('/auth/signin');
      return;
    }

    // 1. Handle Verification logic
    if (status === 'verifying' && !verificationStarted.current) {
      verificationStarted.current = true;
      setPaymentStatus('verifying');

      const verifyPayment = async () => {
        try {
          if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !bookingId) {
            throw new Error('Missing verification details');
          }

          logger.info('Starting full-page verification for booking:', bookingId);

          const response = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id,
              razorpay_order_id,
              razorpay_signature,
              booking_id: bookingId,
            }),
          });

          const rawText = await response.text();
          let result;
          try {
            result = JSON.parse(rawText);
          } catch (e) {
            logger.error('Failed to parse response as JSON. Raw text:', rawText);
            throw new Error(`Server Error (${response.status}): ${rawText.substring(0, 150)}...`);
          }

          if (result.success) {
            logger.info('Full-page verification successful');
            setPaymentStatus('success');
            // Redirect after delay
            setTimeout(() => {
              router.push(`/bookings?success=true&booking_id=${bookingId}`);
            }, 3000);
          } else {
            logger.error('Full-page verification failed:', result);
            setPaymentStatus('failed');
            setVerificationError(result.error || 'Verification failed');
          }
        } catch (error) {
          logger.error('System error during verification:', error);
          setPaymentStatus('failed');
          setVerificationError(error instanceof Error ? error.message : 'System error');
        }
      };

      verifyPayment();
      return;
    }

    // 2. Handle simple status states (from redirects or manual entry)
    if (status === 'success') {
      setPaymentStatus('success');
      setTimeout(() => {
        router.push(`/bookings?success=true&booking_id=${bookingId}`);
      }, 3000);
    }
    else if (status === 'cancelled') {
      setPaymentStatus('cancelled');
    }
    else if (status === 'failed') {
      setPaymentStatus('failed');
    }
    else if (status === 'verifying') {
      // Already handled by the verification block or should stay in verifying state
      if (paymentStatus === 'loading') {
        setPaymentStatus('verifying');
      }
    }
    else {
      setPaymentStatus('loading');
    }
  }, [status, bookingId, sessionStatus, router, razorpay_payment_id, razorpay_order_id, razorpay_signature]);

  // UI - Professional Verification Screen
  if (paymentStatus === 'verifying') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
        <div className="relative mb-8">
          <div className="h-24 w-24 rounded-full border-4 border-gray-50 border-t-primary animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-gray-100" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Verifying Payment</h1>
        <p className="text-gray-500 mt-3 text-lg max-w-sm text-center">
          Securely validating your transaction with Razorpay. Please do not refresh or close this page.
        </p>
        <div className="mt-8 flex gap-2 items-center text-xs text-gray-400">
          <div className="h-1.5 w-1.5 rounded-full bg-orange-200 animate-pulse"></div>
          <span>OnnRides Secure Checkout</span>
        </div>
      </div>
    );
  }

  // UI - Professional Success Screen
  if (paymentStatus === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
        <div className="bg-green-50 rounded-full p-6 mb-8 animate-in zoom-in duration-300">
          <CheckCircle className="w-16 h-16 text-green-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Booking Confirmed!</h1>
        <p className="text-gray-600 mt-3 text-lg text-center max-w-md">
          Your payment has been successfully verified. You will be redirected to your bookings page in a moment.
        </p>

        <div className="mt-10 grid grid-cols-2 gap-4 w-full max-w-sm">
          <Button
            onClick={() => router.push('/bookings')}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium h-12 shadow-sm rounded-lg"
          >
            View Bookings
          </Button>
          <Button
            onClick={() => router.push('/')}
            variant="outline"
            className="w-full border-gray-200 text-gray-600 font-medium h-12 rounded-lg"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // UI - Professional Cancelled Screen
  if (paymentStatus === 'cancelled') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
        <div className="bg-orange-50 rounded-full p-6 mb-8">
          <AlertCircle className="w-16 h-16 text-orange-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payment Cancelled</h1>
        <p className="text-gray-600 mt-3 text-lg text-center max-w-md">
          The payment process was interrupted. No money was deducted from your account.
        </p>
        <div className="mt-10 w-full max-w-xs">
          <Button
            onClick={() => router.push('/')}
            className="w-full bg-gray-900 hover:bg-gray-800 text-white font-medium h-12 rounded-lg"
          >
            Return to Store
          </Button>
        </div>
      </div>
    );
  }

  // UI - Professional Failed Screen
  if (paymentStatus === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
        <div className="bg-red-50 rounded-full p-6 mb-8">
          <XCircle className="w-16 h-16 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Payment Failed</h1>
        <p className="text-gray-600 mt-3 text-lg text-center max-w-md">
          {verificationError || 'Something went wrong during the transaction. Please try again or contact support if the amount was deducted.'}
        </p>

        <div className="mt-10 bg-gray-50 rounded-xl p-6 w-full max-w-md border border-gray-100">
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex justify-between items-center border-b border-gray-200/50 pb-2">
              <span className="text-gray-500">Booking ID</span>
              <span className="font-mono font-medium text-gray-900">{bookingId || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Reason</span>
              <span className="text-red-600 font-medium">{errorType?.replace(/_/g, ' ') || 'Process Failure'}</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 w-full max-w-sm">
          <Button
            onClick={() => router.push(`/vehicles`)}
            className="w-full bg-primary hover:bg-primary/90 text-white font-medium h-12 rounded-lg"
          >
            Try Another Booking
          </Button>
          <Button
            onClick={() => router.push('/contact-us')}
            variant="outline"
            className="w-full h-12 rounded-lg"
          >
            Contact Support
          </Button>
        </div>
      </div>
    );
  }

  // Fallback Loading
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white">
      <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
    </div>
  );
}