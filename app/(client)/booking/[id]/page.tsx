'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';
import { useSession } from 'next-auth/react';

interface BookingDetails {
  vehicleId: string;
  vehicleName: string;
  location: string;
  pickupDateTime: string;
  dropoffDateTime: string;
  basePrice: number;
  gst: number;
  serviceFee: number;
  totalPrice: number;
}

export default function BookingPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [pickupDateTime, setPickupDateTime] = useState(new Date());
  const [dropoffDateTime, setDropoffDateTime] = useState(new Date());
  const [effectiveDuration, setEffectiveDuration] = useState(0);
  const [basePrice, setBasePrice] = useState(0);
  const [gst, setGst] = useState(0);
  const [serviceFee, setServiceFee] = useState(0);
  const [totalPrice, setTotalPrice] = useState(0);

  const handleConfirmBooking = async () => {
    try {
      if (!session?.user) {
        toast.error('Please sign in to continue');
        return;
      }

      if (!bookingDetails) {
        toast.error('Booking details not found');
        return;
      }

      setIsLoading(true);
      
      const payload = {
        amount: totalAmount,
        vehicleId: bookingDetails.vehicleId,
        bookingDetails: {
          pickupDate: pickupDateTime.toISOString(),
          dropoffDate: dropoffDateTime.toISOString(),
          customerDetails: {
            name: session.user.name || 'Guest',
            email: session.user.email || '',
            phone: (session.user as any)?.phone || ''
          }
        }
      };
      
      console.log('Creating booking with payload:', payload);

      try {
        const response = await fetch('/api/payment/create-order', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error response:', errorData);
          if (response.status === 401) {
            toast.error('Please sign in to continue');
            return;
          }
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Response data:', data);

        if (!data.success || !data.data?.orderId) {
          throw new Error(data.error || 'Invalid response from server');
        }

        // Store order info
        const orderInfo = {
          order_id: data.data.orderId,
          booking_id: data.data.bookingId,
          amount: data.data.amount,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem('pendingPayment', JSON.stringify(orderInfo));

        // Initialize Razorpay
        const options = {
          key: data.data.key,
          amount: data.data.amount,
          currency: data.data.currency,
          name: "OnnRides",
          description: "Vehicle Rental Payment",
          order_id: data.data.orderId,
          handler: function (response: any) {
            window.location.href = `/payment-status?reference=${response.razorpay_payment_id}`;
          },
          prefill: {
            name: session.user.name || '',
            email: session.user.email || '',
            contact: (session.user as any)?.phone || ''
          },
          theme: {
            color: "#f97316"
          }
        };

        const razorpay = new (window as any).Razorpay(options);
        razorpay.open();
      } catch (fetchError) {
        console.error('Fetch error details:', fetchError);
        throw fetchError;
      }
      
    } catch (error) {
      console.error('Error in handleConfirmBooking:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to create booking');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Your existing JSX */}
      <button
        onClick={handleConfirmBooking}
        disabled={isLoading}
        className="btn btn-primary"
      >
        {isLoading ? 'Processing...' : 'Confirm Booking'}
      </button>
    </div>
  );
} 