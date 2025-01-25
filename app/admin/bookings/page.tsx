'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';
import { BookingHistoryModal } from '@/components/admin/BookingHistoryModal';

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface Vehicle {
  name: string;
  type: string;
}

interface Duration {
  from: string;
  to: string;
}

interface Booking {
  id: string;
  customer: Customer;
  vehicle: Vehicle;
  booking_date: string;
  duration: Duration;
  amount: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  payment_status: 'pending' | 'completed' | 'failed';
}

interface ApiResponse {
  bookings: Booking[];
  isHistoryView: boolean;
  userId: string | null;
}

export default function AdminBookingsPage() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  const { data, error, isLoading } = useSWR<ApiResponse>(
    '/api/admin/bookings',
    fetcher
  );

  const { data: historyData } = useSWR<ApiResponse>(
    selectedCustomerId ? `/api/admin/bookings?userId=${selectedCustomerId}&history=true` : null,
    fetcher
  );

  if (error) return <div className="p-4 text-red-500">Failed to load bookings</div>;
  if (isLoading) return <div className="p-4">Loading...</div>;

  const bookings = data?.bookings || [];
  const customerHistory = historyData?.bookings || [];

  const handleViewHistory = (customerId: string) => {
    setSelectedCustomerId(customerId);
    setIsHistoryModalOpen(true);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Bookings Management</h1>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booking Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookings.map((booking) => (
              <tr key={booking.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{booking.customer.name}</div>
                  <div className="text-sm text-gray-500">{booking.customer.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{booking.vehicle.name}</div>
                  <div className="text-sm text-gray-500">{booking.vehicle.type}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {booking.booking_date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {booking.duration.from} - {booking.duration.to}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {booking.amount}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                      booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'}`}>
                    {booking.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${booking.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                      booking.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'}`}>
                    {booking.payment_status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleViewHistory(booking.customer.id)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    View History
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isHistoryModalOpen && customerHistory.length > 0 && (
        <BookingHistoryModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          bookings={customerHistory}
          customerName={bookings.find(b => b.customer.id === selectedCustomerId)?.customer.name || ''}
        />
      )}
    </div>
  );
} 