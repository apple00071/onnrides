'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Loader2, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import logger from '@/lib/logger';

type PaymentStatus = 'loading' | 'success' | 'failed' | 'cancelled';

export default function PaymentStatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('loading');
  
  // Get parameters from URL
  const status = searchParams.get('status');
  const bookingId = searchParams.get('booking_id');
  const errorType = searchParams.get('error');
  const paymentId = searchParams.get('payment_id');
  
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
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-green-600">Payment Successful!</h1>
          <p className="mt-4 text-gray-600">Your booking has been confirmed.</p>
          <p className="mt-2 text-gray-600">Booking ID: {bookingId}</p>
          <p className="mt-2 text-gray-500">Redirecting to your bookings...</p>
        </div>
      </div>
    );
  }

  // Cancelled state
  if (paymentStatus === 'cancelled') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <AlertCircle className="h-16 w-16 text-orange-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-orange-600">Payment Cancelled</h1>
          <p className="mt-4 text-gray-600">You cancelled the payment process.</p>
          <p className="mt-2 text-gray-600">Booking ID: {bookingId}</p>
          
          <div className="mt-8 space-y-4">
            <button 
              onClick={() => router.push(`/booking-summary?booking_id=${bookingId}`)}
              className="w-full py-2 px-4 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
            
            <button 
              onClick={() => router.push('/')}
              className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Failed state
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-red-600">Payment Failed</h1>
        
        <div className="mt-4 text-gray-600">
          {errorType === 'missing_params' ? (
            <p>Your payment could not be verified because some required information was missing.</p>
          ) : errorType === 'verification_failed' ? (
            <p>Your payment was processed but could not be verified by our system.</p>
          ) : (
            <p>There was an issue processing your payment.</p>
          )}
        </div>
        
        <div className="mt-6 space-y-2 text-left bg-gray-50 p-4 rounded border">
          <p className="font-semibold">Payment Details:</p>
          <p className="text-sm">Booking ID: <span className="font-mono">{bookingId || 'Not available'}</span></p>
          {paymentId && (
            <p className="text-sm">Payment ID: <span className="font-mono">{paymentId}</span></p>
          )}
        </div>
        
        <div className="mt-6 space-y-2 text-left">
          <p className="font-semibold">Please contact our support team:</p>
          <p className="text-sm">Email: <a href="mailto:support@onnrides.com" className="text-blue-600 hover:underline">support@onnrides.com</a></p>
          <p className="text-sm">Phone: <a href="tel:+918247494622" className="text-blue-600 hover:underline">+91 8247494622</a></p>
        </div>
        
        <div className="mt-8 space-y-4">
          <button 
            onClick={() => router.push(`/booking-summary?booking_id=${bookingId}`)}
            className="w-full py-2 px-4 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
          >
            Try Payment Again
          </button>
          
          <button 
            onClick={() => router.push('/bookings')}
            className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors"
          >
            View Your Bookings
          </button>
        </div>
      </div>
    </div>
  );
} 