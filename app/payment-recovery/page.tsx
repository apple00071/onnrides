'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import logger from '@/lib/logger';

export default function PaymentRecoveryPage() {
  const router = useRouter();
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const storedPayment = localStorage.getItem('pendingPayment');
    if (storedPayment) {
      try {
        setPendingPayment(JSON.parse(storedPayment));
      } catch (error) {
        logger.error('Error parsing pending payment:', error);
        localStorage.removeItem('pendingPayment');
        router.push('/');
      }
    } else {
      router.push('/');
    }
  }, [router]);

  const handleVerifyPayment = async () => {
    if (!pendingPayment) return;

    setIsVerifying(true);
    try {
      const response = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: pendingPayment.booking_id,
          razorpay_order_id: pendingPayment.razorpay_order_id,
          razorpay_payment_id: pendingPayment.razorpay_payment_id,
          razorpay_signature: pendingPayment.razorpay_signature,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Payment verified successfully!');
        localStorage.removeItem('pendingPayment');
        router.push(`/bookings?success=true&booking_id=${pendingPayment.booking_id}`);
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error) {
      logger.error('Error verifying payment:', error);
      toast.error('Failed to verify payment. Please contact support.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!pendingPayment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Pending Payment Verification
            </h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>
                We noticed that your last payment needs verification. Please verify your payment to complete the booking process.
              </p>
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Payment ID
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    value={pendingPayment.razorpay_payment_id}
                    readOnly
                    className="block w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Order ID
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    value={pendingPayment.razorpay_order_id}
                    readOnly
                    className="block w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Amount
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    value={`₹${(pendingPayment.amount / 100).toFixed(2)}`}
                    readOnly
                    className="block w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-50 text-gray-500"
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-4">
              <button
                onClick={handleVerifyPayment}
                disabled={isVerifying}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? 'Verifying...' : 'Verify Payment'}
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('pendingPayment');
                  router.push('/');
                }}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 