'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { Loader2 } from 'lucide-react';
import { getBadgeColor } from '@/lib/constants/status-colors';

interface Booking {
  id: string;
  booking_id: string;
  vehicle: {
    name: string;
    type: string;
  };
  user: {
    name: string;
    phone: string;
  };
  start_date: string;
  end_date: string;
  total_price: number;
  status: string;
  payment_status: string;
  booking_type: string;
  registration_number: string;
  pickup_location?: string | null;
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/admin/bookings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setBookings(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch bookings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => fetchBookings()}
            className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Booking Management</h1>
          <p className="text-gray-600">{bookings.length} bookings found</p>
        </div>
        <button
          onClick={() => router.push('/admin/offline-booking')}
          className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/90"
        >
          Create Offline Booking
        </button>
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-600">No bookings found</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg overflow-hidden">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">VEHICLE</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">LOCATION</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">CUSTOMER</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">START</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">END</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">AMOUNT</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">TYPE</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">STATUS</th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">PAYMENT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bookings.map((booking) => (
                <tr
                  key={booking.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/admin/bookings/${booking.booking_id}`)}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{booking.booking_id}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.vehicle.name}</div>
                    <div className="text-sm text-gray-500">{booking.registration_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.pickup_location || 'Not specified'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.user.name}</div>
                    <div className="text-sm text-gray-500">{booking.user.phone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(booking.start_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(booking.end_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ₹{booking.total_price.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {booking.booking_type.charAt(0).toUpperCase() + booking.booking_type.slice(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getBadgeColor(booking.status)}`}>
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getBadgeColor(booking.payment_status)}`}>
                      {booking.booking_type === 'online' && booking.payment_status === 'completed' ?
                        '5% Collected' :
                        booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)
                      }
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 