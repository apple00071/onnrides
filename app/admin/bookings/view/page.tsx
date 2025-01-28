'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface BookingDetails {
  id: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  vehicle: {
    name: string;
    type: string;
  };
  start_date: string;
  end_date: string;
  total_hours: number;
  total_price: number;
  status: string;
  payment_status: string;
  pickup_location: string;
  dropoff_location: string;
  created_at: string;
}

export default function BookingViewPage() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId) return;
      
      try {
        const response = await fetch(`/api/admin/bookings/${bookingId}`);
        if (!response.ok) throw new Error('Failed to fetch booking details');
        const data = await response.json();
        setBooking(data.booking);
      } catch (error) {
        console.error('Error fetching booking details:', error);
        toast.error('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f26e24] border-t-transparent"></div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-2">Booking Not Found</h2>
        <p className="text-gray-600 mb-4">The booking you are looking for does not exist.</p>
        <Button onClick={() => window.history.back()}>Go Back</Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Booking Details</h1>
        <Button onClick={() => window.history.back()} variant="outline">
          Back to Bookings
        </Button>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Customer Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Name</p>
              <p className="font-medium">{booking.user.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="font-medium">{booking.user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Phone</p>
              <p className="font-medium">{booking.user.phone}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Vehicle Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Vehicle</p>
              <p className="font-medium">{booking.vehicle.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="font-medium">{booking.vehicle.type}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Booking Information</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Start Date</p>
              <p className="font-medium">{formatDate(booking.start_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">End Date</p>
              <p className="font-medium">{formatDate(booking.end_date)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Hours</p>
              <p className="font-medium">{booking.total_hours} hours</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Price</p>
              <p className="font-medium">{formatCurrency(booking.total_price)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Pickup Location</p>
              <p className="font-medium">{booking.pickup_location}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Dropoff Location</p>
              <p className="font-medium">{booking.dropoff_location}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Booking Status</p>
              <span className={`inline-block px-2 py-1 rounded-full text-sm ${
                booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
              </span>
            </div>
            <div>
              <p className="text-sm text-gray-500">Payment Status</p>
              <span className={`inline-block px-2 py-1 rounded-full text-sm ${
                booking.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                booking.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
} 