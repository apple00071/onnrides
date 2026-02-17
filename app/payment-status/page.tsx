'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import logger from '@/lib/logger';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

type PaymentStatus = 'loading' | 'success' | 'failed' | 'cancelled';

export default function PaymentStatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');

  // Get parameters from URL using useSearchParams hook
  const status = searchParams.get('status');
  const bookingId = searchParams.get('booking_id') || searchParams.get('bookingId');
  const errorType = searchParams.get('error');
  const paymentId = searchParams.get('payment_id') || searchParams.get('paymentId');

  useEffect(() => {
    if (sessionStatus === 'loading') return;

    if (sessionStatus === 'unauthenticated') {
      toast.error('Please sign in to view payment status');
      router.push('/auth/signin');
      return;
    }

    // Set payment status from URL parameter
    if (status === 'success') {
      setPaymentStatus('success');

      // Redirect to booking details after a short delay
      setTimeout(() => {
        router.push(`/bookings?success=true&booking_id=${bookingId}`);
      }, 3000);
    }
    else if (status === 'cancelled') {
      setPaymentStatus('cancelled');
    }
    else if (status === 'failed') {
      setPaymentStatus('failed');

      // Log the error details for debugging
      logger.error('Payment failed:', {
        bookingId,
        errorType,
        paymentId
      });
    }
    else {
      setPaymentStatus('loading');
    }
  }, [status, bookingId, errorType, paymentId, sessionStatus, router]);

  // Loading state
  if (sessionStatus === 'loading' || paymentStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h1 className="text-2xl font-semibold">Processing Payment</h1>
        <p className="text-gray-600 mt-2">Please wait while we verify your payment...</p>
      </div>
    );
  }

  // Success state
  if (paymentStatus === 'success') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-green-600 mb-2">Payment Successful</h1>
            <p className="text-gray-600 mb-6">
              Your payment was processed successfully. Your booking is now confirmed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Cancelled state
  if (paymentStatus === 'cancelled') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center">
            <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-orange-600 mb-2">Payment Cancelled</h1>
            <p className="text-gray-600 mb-6">
              You cancelled the payment process.
            </p>
            <Button onClick={() => router.push('/')} variant="default" className="w-full">
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-red-600 mb-2">Payment Failed</h1>
          <p className="text-gray-600 mb-6">
            {errorType === 'signature_verification_failed' ? (
              'The payment signature could not be verified. This could be due to a technical issue.'
            ) : errorType === 'payment_not_captured' ? (
              'Your payment was initiated but could not be captured successfully.'
            ) : errorType === 'verification_failed' ? (
              'We could not verify your payment with our payment provider.'
            ) : errorType === 'booking_not_found' ? (
              'We could not find your booking in our system. This might be because the booking has expired or was cancelled.'
            ) : (
              'Your payment could not be processed successfully.'
            )}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold mb-2">Payment Details:</h2>
            <div className="space-y-2 text-left">
              {bookingId && (
                <p className="text-sm">
                  <span className="font-medium">Booking ID:</span> {bookingId}
                </p>
              )}
              {paymentId && (
                <p className="text-sm">
                  <span className="font-medium">Payment ID:</span> {paymentId}
                </p>
              )}
              <p className="text-sm">
                <span className="font-medium">Status:</span>{' '}
                <span className="text-red-600 font-medium">Failed</span>
              </p>
              {errorType && (
                <p className="text-sm">
                  <span className="font-medium">Error Type:</span>{' '}
                  {errorType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </p>
              )}
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <h2 className="text-lg font-semibold text-yellow-800 mb-2">What should you do?</h2>
            <ul className="text-left text-sm space-y-2 text-yellow-800">
              {errorType === 'booking_not_found' ? (
                <>
                  <li>1. Check if you have an active booking in your account.</li>
                  <li>2. If you believe this is an error, please contact our support team.</li>
                  <li>3. You can try making a new booking if your previous one has expired.</li>
                </>
              ) : (
                <>
                  <li>1. Don't worry - no money has been deducted from your account.</li>
                  <li>2. You can try the payment again after a few minutes.</li>
                  <li>3. If money was deducted, it will be refunded within 5-7 working days.</li>
                  <li>4. Contact our support team if you need immediate assistance.</li>
                </>
              )}
            </ul>
          </div>

          <div className="text-left mb-6">
            <h2 className="text-lg font-semibold mb-2">Contact Support:</h2>
            <p className="text-sm mb-1">
              <span className="font-medium">Email:</span>{' '}
              <a href="mailto:support@onnrides.com" className="text-primary hover:underline">
                support@onnrides.com
              </a>
            </p>
            <p className="text-sm">
              <span className="font-medium">Phone:</span>{' '}
              <a href="tel:+918247494622" className="text-primary hover:underline">
                +91 8247494622
              </a>
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {errorType === 'booking_not_found' ? (
              <>
                <Button onClick={() => router.push('/bookings')} variant="default" className="w-full mb-2">
                  View Your Bookings
                </Button>
                <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                  Back to Home
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => router.push(`/bookings/${bookingId}/retry-payment`)} variant="default" className="w-full mb-2">
                  Try Payment Again
                </Button>
                <Button onClick={() => router.push('/bookings')} variant="outline" className="w-full mb-2">
                  View Your Bookings
                </Button>
                <Button onClick={() => router.push('/')} variant="outline" className="w-full">
                  Back to Home
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 