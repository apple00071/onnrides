'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface Booking {
  id: string;
  vehicle_name: string;
  pickup_date: string;
  dropoff_date: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await fetch('/api/user/bookings');
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }
      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      const response = await fetch(`/api/user/bookings/${bookingId}/cancel`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      toast.success('Booking cancelled successfully');
      fetchBookings(); // Refresh the list
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to cancel booking');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">My Bookings</h1>
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Dates
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {booking.vehicle_name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {format(new Date(booking.pickup_date), 'MMM d, yyyy')}
                  </div>
                  <div className="text-sm text-gray-500">
                    to {format(new Date(booking.dropoff_date), 'MMM d, yyyy')}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{booking.total_amount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    booking.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : booking.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : booking.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                  }`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {booking.status === 'pending' && (
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
} 