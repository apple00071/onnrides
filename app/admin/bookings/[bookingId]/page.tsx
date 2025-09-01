'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { ArrowLeft } from 'lucide-react';
import { BookingActions } from '@/components/bookings/BookingActions';

interface BookingDetails {
  id: string;
  booking_id: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  vehicle: {
    name: string;
    type: string;
  };
  amount: number;
  status: string;
  payment_status: string;
  booking_type: string;
  duration: {
    from: string;
    to: string;
  };
  vehicle_return?: {
    additional_charges: number;
    condition_notes: string;
    return_date: string;
  };
  notes?: string;
}

export default function BookingDetailsPage({ params }: { params: { bookingId: string } }) {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchBookingDetails();
  }, [params.bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/bookings/${params.bookingId}`);
      const result = await response.json();

      if (result.success) {
        setBooking(result.data);
      } else {
        setError(result.error || 'Failed to fetch booking details');
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setError('Failed to fetch booking details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Booking not found</h2>
          <button
            onClick={() => router.back()}
            className="mt-4 text-[#f26e24] hover:text-[#d95e1d] flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={20} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-[#f26e24] hover:text-[#d95e1d] flex items-center gap-2"
        >
          <ArrowLeft size={20} /> Back to Bookings
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Booking Details</h1>
            <p className="text-gray-600">Booking ID: {booking.booking_id}</p>
          </div>
          <div className="flex gap-2">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              booking.status === 'completed' ? 'bg-green-100 text-green-800' :
              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              booking.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              Payment: {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Vehicle</h3>
              <p className="mt-1 text-lg">{booking.vehicle.name}</p>
              <p className="text-gray-600">{booking.vehicle.type}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Customer Details</h3>
              <p className="mt-1">{booking.customer.name}</p>
              <p className="text-gray-600">{booking.customer.phone}</p>
              <p className="text-gray-600">{booking.customer.email}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Booking Type</h3>
              <p className="mt-1 capitalize">{booking.booking_type}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Duration</h3>
              <p className="mt-1">From: {formatDateTime(booking.duration.from)}</p>
              <p className="mt-1">To: {formatDateTime(booking.duration.to)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Amount</h3>
              <p className="mt-1 text-lg font-semibold">₹{booking.amount.toLocaleString()}</p>
            </div>
            {booking.vehicle_return && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Vehicle Return Details</h3>
                <p className="mt-1">Return Date: {formatDateTime(booking.vehicle_return.return_date)}</p>
                {booking.vehicle_return.additional_charges > 0 && (
                  <p className="text-red-600">Additional Charges: ₹{booking.vehicle_return.additional_charges.toLocaleString()}</p>
                )}
                {booking.vehicle_return.condition_notes && (
                  <p className="mt-1 text-gray-600">{booking.vehicle_return.condition_notes}</p>
                )}
              </div>
            )}
            {booking.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                <p className="mt-1 text-gray-600">{booking.notes}</p>
              </div>
            )}
          </div>
        </div>

        <BookingActions 
          bookingId={booking.booking_id} 
          currentStatus={booking.status}
        />
      </div>
    </div>
  );
} 