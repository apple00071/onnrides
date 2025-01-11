'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import logger from '@/lib/logger';
import { toast } from 'react-hot-toast';

interface BookingDetails {
  id: string;
  vehicle_name: string;
  user_name: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  pickup_location: string;
  drop_location: string;
  amount: number;
}

export default function PaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [qrCode, setQrCode] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);

  const initializePayment = async () => {
    try {
      const response = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      if (!data.qrCode) {
        throw new Error('No QR code received from server');
      }

      setQrCode(data.qrCode);
      setPaymentRef(data.paymentRef);
      setBookingDetails(data.bookingDetails);
    } catch (error) {
      logger.error('Payment initiation error:', error);
      toast.error('Failed to generate payment QR code');
      router.push('/bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initializePayment();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Complete Payment</h1>
        {bookingDetails && (
          <div className="mb-6 space-y-2">
            <p><span className="font-semibold">Vehicle:</span> {bookingDetails.vehicle_name}</p>
            <p><span className="font-semibold">Pickup:</span> {bookingDetails.pickup_datetime}</p>
            <p><span className="font-semibold">Drop-off:</span> {bookingDetails.dropoff_datetime}</p>
            <p><span className="font-semibold">Amount:</span> ₹{bookingDetails.amount}</p>
          </div>
        )}
        {qrCode && (
          <div className="flex flex-col items-center space-y-4">
            <div className="relative w-64 h-64">
              <Image
                src={qrCode}
                alt="Payment QR Code"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-sm text-gray-600">Scan QR code to complete payment</p>
            <p className="text-xs text-gray-500">Reference: {paymentRef}</p>
          </div>
        )}
      </div>
    </div>
  );
} 