'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';

interface Booking {
  id: string;
  vehicle_name: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  pickup_location: string;
  drop_location: string;
  total_amount: number;
  status: string;
  payment_status: string;
  booking_number?: string;
  amount: number;
  duration: number;
  vehicle: {
    price_per_hour: number;
  };
}

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const success = searchParams.get('success');
  const bookingNumber = searchParams.get('booking_number');
  
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Show success message if booking was just completed
    if (success && bookingNumber) {
      toast.success(`Booking confirmed! Your booking number is ${bookingNumber}`);
    }
  }, [success, bookingNumber]);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await fetch('/api/user/bookings');
        
        if (!response.ok) {
          throw new Error('Failed to fetch bookings');
        }
        
        const data = await response.json();
        setBookings(data);
      } catch (error) {
        toast.error('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  const handleMakePayment = async (booking: Booking) => {
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId: booking.id }),
      });

      if (!response.ok) {
        throw new Error('Failed to initiate payment');
      }

      const data = await response.json();
      window.location.href = data.paymentUrl;
    } catch (error) {
      toast.error('Failed to initiate payment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">My Bookings</h1>

        {bookings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No bookings found</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-lg shadow overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      {booking.vehicle_name}
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                        {booking.status}
                      </span>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                        booking.payment_status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.payment_status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-500">Pickup</p>
                      <p className="font-medium">
                        {new Date(booking.pickup_datetime).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {booking.pickup_location}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Drop-off</p>
                      <p className="font-medium">
                        {new Date(booking.dropoff_datetime).toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {booking.drop_location}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Total Amount</p>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold">₹{booking.amount}</span>
                          <span className="text-sm text-gray-500">total</span>
                        </div>
                        <div className="text-sm text-gray-500">
                          Duration: {booking.duration} {booking.duration === 1 ? 'hour' : 'hours'}
                        </div>
                        <div className="text-sm text-gray-500">
                          Rate: ₹{booking.vehicle.price_per_hour}/hour
                        </div>
                      </div>
                    </div>
                    {booking.payment_status === 'pending' && (
                      <button
                        onClick={() => handleMakePayment(booking)}
                        className="px-4 py-2 bg-primary text-white font-medium rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      >
                        Make Payment
                      </button>
                    )}
                    {booking.booking_number && (
                      <div>
                        <p className="text-sm text-gray-500">Booking Number</p>
                        <p className="font-medium">{booking.booking_number}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 