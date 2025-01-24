'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface PaymentPageProps {
  params: {
    bookingId: string;
  };
}

export default function PaymentPage({ params }: PaymentPageProps) {
  const { bookingId } = params;
  const [loading, setLoading] = React.useState(false);
  const [booking, setBooking] = React.useState<any>(null);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  const { data: session } = useSession({
    required: true,
    onUnauthenticated() {
      router.push(`/auth/login?callbackUrl=/bookings/${bookingId}/payment`);
    },
  });

  React.useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch(`/api/bookings/${bookingId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch booking details');
        }
        const data = await response.json();
        setBooking(data.booking);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to fetch booking');
      }
    };

    if (bookingId) {
      fetchBooking();
    }
  }, [bookingId]);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // Create order
      const orderResponse = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          amount: booking.total_price,
        }),
      });

      if (!orderResponse.ok) {
        throw new Error('Failed to create payment order');
      }

      const { orderId } = await orderResponse.json();

      // Initialize Razorpay
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: booking.total_price * 100, // amount in paisa
        currency: 'INR',
        name: 'OnnRides',
        description: `Booking #${bookingId}`,
        order_id: orderId,
        prefill: {
          name: session?.user?.name || '',
          email: session?.user?.email || '',
        },
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/payments/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                bookingId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              throw new Error('Payment verification failed');
            }

            toast.success('Payment successful!');
            router.push(`/bookings/${bookingId}/success`);
          } catch (error) {
            toast.error('Payment verification failed');
          }
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          },
        },
        theme: {
          color: '#f26e24',
        },
      };

      const razorpay = new (window as any).Razorpay(options);
      razorpay.open();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Payment failed');
      toast.error('Failed to initiate payment');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#fff8f0] flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">{error}</p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.back()} variant="outline">Go Back</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-[#fff8f0] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff8f0] flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Payment</CardTitle>
          <CardDescription>Booking #{bookingId}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Vehicle</span>
            <span className="font-medium">{booking.vehicle.name}</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Duration</span>
            <span className="font-medium">{booking.total_hours} hours</span>
          </div>
          <div className="flex justify-between py-2 border-b">
            <span className="text-gray-600">Amount</span>
            <span className="font-medium">{formatCurrency(booking.total_price)}</span>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            onClick={handlePayment}
            disabled={loading}
            className="bg-[#f26e24] hover:bg-[#e05d13] text-white"
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
} 