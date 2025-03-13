'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import logger from '@/lib/logger';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface PendingPayment {
  booking_id?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  amount?: number;
  timestamp?: string;
}

export default function PaymentRecoveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [manualRecovery, setManualRecovery] = useState(false);
  const [bookingId, setBookingId] = useState<string>('');
  const [paymentId, setPaymentId] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');
  const [signature, setSignature] = useState<string>('');

  useEffect(() => {
    const urlBookingId = searchParams.get('booking_id');
    
    // First try to get stored payment from localStorage
    const storedPayment = localStorage.getItem('pendingPayment');
    
    if (storedPayment) {
      try {
        const parsedPayment = JSON.parse(storedPayment);
        logger.info('Found pending payment data in localStorage:', {
          ...parsedPayment,
          signature: parsedPayment.razorpay_signature ? 'exists' : 'missing'
        });
        setPendingPayment(parsedPayment);
        
        // If the URL has a booking ID, verify it matches the stored payment
        if (urlBookingId && parsedPayment.booking_id !== urlBookingId) {
          logger.warn('URL booking ID does not match stored payment booking ID', {
            urlBookingId,
            storedBookingId: parsedPayment.booking_id
          });
          toast.warning('The booking ID in the URL does not match your stored payment.');
        }
      } catch (error) {
        logger.error('Error parsing pending payment:', error);
        localStorage.removeItem('pendingPayment');
        
        // If there's a booking ID in the URL, switch to manual recovery
        if (urlBookingId) {
          setManualRecovery(true);
          setBookingId(urlBookingId);
          logger.info('Switching to manual recovery with booking ID from URL:', urlBookingId);
        } else {
          toast.error('No valid payment data found.');
          router.push('/');
        }
      }
    } else if (urlBookingId) {
      // No stored payment, but we have a booking ID in the URL
      setManualRecovery(true);
      setBookingId(urlBookingId);
      logger.info('No stored payment data. Using booking ID from URL for manual recovery:', urlBookingId);
    } else {
      // No stored payment and no booking ID in URL
      toast.error('No payment data found to recover.');
      router.push('/');
    }
    
    setIsLoading(false);
  }, [router, searchParams]);

  const handleVerifyPayment = async () => {
    if (!pendingPayment && !manualRecovery) return;
    
    setIsVerifying(true);
    try {
      // Prepare the verification data
      const verificationData = manualRecovery ? 
        {
          booking_id: bookingId,
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId,
          razorpay_signature: signature
        } : 
        {
          booking_id: pendingPayment?.booking_id,
          razorpay_order_id: pendingPayment?.razorpay_order_id,
          razorpay_payment_id: pendingPayment?.razorpay_payment_id,
          razorpay_signature: pendingPayment?.razorpay_signature
        };
      
      logger.info('Attempting to verify payment with data:', {
        ...verificationData,
        razorpay_signature: verificationData.razorpay_signature ? 'exists' : 'missing'
      });

      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(verificationData),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Payment verified successfully!');
        localStorage.removeItem('pendingPayment');
        const finalBookingId = manualRecovery ? bookingId : pendingPayment?.booking_id;
        router.push(`/bookings?success=true&booking_id=${finalBookingId}`);
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error) {
      logger.error('Error verifying payment:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to verify payment. Please contact support.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {manualRecovery ? 'Manual Payment Recovery' : 'Pending Payment Verification'}
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>
                {manualRecovery 
                  ? 'Please enter your payment details to manually verify your payment.' 
                  : 'We found a pending payment that needs verification. Please verify your payment to complete the booking process.'}
              </p>
            </div>
            
            {manualRecovery ? (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Booking ID</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={bookingId}
                      onChange={(e) => setBookingId(e.target.value)}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      placeholder="e.g. OR123"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment ID</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={paymentId}
                      onChange={(e) => setPaymentId(e.target.value)}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      placeholder="e.g. pay_123456789"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order ID</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      placeholder="e.g. order_123456789"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Signature</label>
                  <div className="mt-1">
                    <input
                      type="text"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      className="block w-full px-3 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                      placeholder="Razorpay signature"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                {pendingPayment?.razorpay_payment_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Payment ID</label>
                    <div className="mt-1">
                      <input
                        type="text"
                        value={pendingPayment.razorpay_payment_id}
                        readOnly
                        className="block w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>
                )}
                {pendingPayment?.razorpay_order_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Order ID</label>
                    <div className="mt-1">
                      <input
                        type="text"
                        value={pendingPayment.razorpay_order_id}
                        readOnly
                        className="block w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>
                )}
                {pendingPayment?.booking_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Booking ID</label>
                    <div className="mt-1">
                      <input
                        type="text"
                        value={pendingPayment.booking_id}
                        readOnly
                        className="block w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-50 text-gray-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            
            <div className="mt-6 space-y-4">
              <Button
                onClick={handleVerifyPayment}
                disabled={isVerifying || (manualRecovery && (!bookingId || !paymentId || !orderId || !signature))}
                className="w-full"
                variant="default"
              >
                {isVerifying ? (
                  <span className="flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  'Verify Payment'
                )}
              </Button>
              
              {!manualRecovery && (
                <div className="text-center">
                  <button
                    onClick={() => setManualRecovery(true)}
                    className="text-sm text-orange-600 hover:text-orange-500"
                  >
                    Switch to Manual Recovery
                  </button>
                </div>
              )}
              
              <Button
                onClick={() => {
                  localStorage.removeItem('pendingPayment');
                  router.push('/');
                }}
                className="w-full"
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 