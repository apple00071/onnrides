'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

export default function PaymentRecoveryPage() {
  const router = useRouter();
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Check for pending payment in localStorage
    const storedPayment = localStorage.getItem('pendingPayment');
    if (storedPayment) {
      try {
        const payment = JSON.parse(storedPayment);
        setPendingPayment(payment);
      } catch (error) {
        console.error('Error parsing pending payment:', error);
        toast.error('Invalid payment data');
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
      const baseURL = process.env.NEXT_PUBLIC_VERCEL_URL 
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : process.env.NEXT_PUBLIC_APP_URL || window.location.origin;

      const response = await fetch(`${baseURL}/api/payment/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          razorpay_order_id: pendingPayment.razorpay_order_id,
          razorpay_payment_id: pendingPayment.razorpay_payment_id,
          razorpay_signature: pendingPayment.razorpay_signature,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Payment verified successfully!');
        localStorage.removeItem('pendingPayment');
        router.push('/bookings');
      } else {
        throw new Error(data.error || 'Verification failed');
      }
    } catch (error) {
      console.error('Error verifying payment:', error);
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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Pending Payment Found
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We found an unverified payment from{' '}
            {new Date(pendingPayment.timestamp).toLocaleString()}
          </p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment ID
              </label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <input
                  type="text"
                  value={pendingPayment.razorpay_payment_id}
                  readOnly
                  className="flex-1 min-w-0 block w-full px-3 py-2 rounded-md border border-gray-300 bg-gray-50 text-gray-500"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pendingPayment.razorpay_payment_id);
                    toast.success('Payment ID copied to clipboard');
                  }}
                  className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Copy
                </button>
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
  );
} 