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

interface PaymentStatusPageProps {
  searchParams: {
    status?: string;
    error?: string;
    booking_id?: string;
    payment_id?: string;
  };
}

export default function PaymentStatusPage({ searchParams }: PaymentStatusPageProps) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');
  
  // Get parameters from URL
  const status = searchParams.status;
  const bookingId = searchParams.booking_id;
  const errorType = searchParams.error;
  const paymentId = searchParams.payment_id;
  
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
            Your payment was processed but could not be verified by our system.
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
            </div>
          </div>

          <div className="text-left mb-6">
            <h2 className="text-lg font-semibold mb-2">Please contact our support team:</h2>
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
            <Button asChild variant="default" className="w-full">
              <Link href="/bookings">
                View Your Bookings
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 