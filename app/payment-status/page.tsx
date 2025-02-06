'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { logger } from '@/lib/logger';
import { Spinner } from '@/components/ui/spinner';
import { CheckCircle2 } from 'lucide-react';

export default function PaymentStatusPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reference = searchParams.get('reference');
  
  const { data: session, status: sessionStatus } = useSession({
    required: true,
    onUnauthenticated() {
      router.push('/auth/signin');
    }
  });

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasNotified, setHasNotified] = useState(false);

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get payment reference from URL or localStorage
        let payment_reference = reference;
        let order_id;
        
        // Get order ID from localStorage
        const pendingPayment = localStorage.getItem('pendingPayment');
        if (pendingPayment) {
          try {
            const paymentData = JSON.parse(pendingPayment);
            order_id = paymentData.order_id;
            
            // If no reference in URL, try from localStorage
            if (!payment_reference) {
              payment_reference = paymentData.razorpay_payment_id || paymentData.payment_reference;
            }
          } catch (error) {
            logger.error('Failed to parse pending payment:', error);
          }
        }

        if (!payment_reference || !order_id) {
          throw new Error('Invalid payment data');
        }

        logger.info('Starting payment verification', {
          payment_reference,
          order_id,
          userId: session?.user?.id
        });

        // Send verification request
        const response = await fetch('/api/payment/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ 
            payment_reference,
            order_id
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to verify payment');
        }

        const data = await response.json();
        if (data.success && !hasNotified) {
          setStatus('success');
          localStorage.removeItem('pendingPayment');
          toast.success('Payment verified successfully');
          setHasNotified(true);
          setTimeout(() => router.push('/bookings'), 2000);
        } else {
          throw new Error(data.error || 'Failed to verify payment');
        }

      } catch (error) {
        logger.error('Payment verification error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to verify payment';
        setError(errorMessage);
        setStatus('error');
        toast.error(errorMessage);
        if (errorMessage.includes('Invalid payment data')) {
          setTimeout(() => router.push('/'), 2000);
        }
      } finally {
        setIsVerifying(false);
      }
    };

    if (sessionStatus === 'loading') {
      return;
    }

    if (!session) {
      const error = 'Authentication required';
      logger.error(error);
      setError(error);
      setStatus('error');
      toast.error(error);
      setTimeout(() => router.push('/auth/signin'), 2000);
      return;
    }

    verifyPayment();
  }, [session, sessionStatus, router, reference, hasNotified]);

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Spinner size="lg" />
        <p className="mt-4 text-lg text-gray-600">Verifying payment...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="text-red-500 text-xl mb-4">❌</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Verification Failed</h1>
        <p className="text-gray-600">{error || 'Please contact support'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-4">
        {isVerifying ? (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#f26e24] border-t-transparent mx-auto"></div>
            <h1 className="text-2xl font-semibold">Verifying Payment...</h1>
            <p className="text-gray-600">Please wait while we verify your payment</p>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-2xl font-semibold">Payment Verified</h1>
            <p className="text-gray-600">Redirecting to your bookings...</p>
          </>
        )}
      </div>
    </div>
  );
} 