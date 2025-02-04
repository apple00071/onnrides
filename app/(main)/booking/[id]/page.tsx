'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CashfreeCheckout } from '@/components/CashfreeCheckout';
import { Dialog } from '@/components/ui/dialog';

interface PaymentData {
  orderId: string;
  sessionId: string;
  bookingId: string;
}

export default function BookingPage({ 
  vehicle,
  pickupDate,
  dropoffDate,
  pickupLocation,
  basePrice,
  gst,
  serviceFee,
  totalPrice 
}: any) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);

  const handleConfirmBooking = async () => {
    try {
      setIsLoading(true);

      // Create order
      const response = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: totalPrice,
          bookingDetails: {
            vehicleId: vehicle.id,
            vehicleName: vehicle.name,
            pickupDateTime: pickupDate,
            dropoffDateTime: dropoffDate,
            location: pickupLocation,
            basePrice: basePrice,
            gst: gst,
            serviceFee: serviceFee,
            totalPrice: totalPrice
          }
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create booking');
      }

      // Show Cashfree checkout in dialog
      setPaymentData({
        orderId: result.data.orderId,
        sessionId: result.data.sessionId,
        bookingId: result.data.bookingId
      });
      setShowPayment(true);

    } catch (error) {
      console.error('Error in handleConfirmBooking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process payment. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (data: any) => {
    try {
      // Verify payment
      const response = await fetch(`/api/payment/verify?order_id=${paymentData?.orderId}`, {
        method: 'GET'
      });

      if (!response.ok) {
        throw new Error('Failed to verify payment');
      }

      toast.success('Booking confirmed successfully!');
      setShowPayment(false);
      router.push(`/bookings/${paymentData?.bookingId}`);
    } catch (error) {
      console.error('Payment verification error:', error);
      toast.error('Failed to verify payment. Please contact support.');
    }
  };

  const handlePaymentFailure = (error: any) => {
    console.error('Payment failed:', error);
    toast.error('Payment failed. Please try again.');
    setShowPayment(false);
  };

  return (
    <div>
      {/* ... existing JSX ... */}
      
      <Dialog open={showPayment} onOpenChange={setShowPayment}>
        <div className="p-4">
          {paymentData && (
            <CashfreeCheckout
              orderId={paymentData.orderId}
              sessionId={paymentData.sessionId}
              onSuccess={handlePaymentSuccess}
              onFailure={handlePaymentFailure}
            />
          )}
        </div>
      </Dialog>
    </div>
  );
} 