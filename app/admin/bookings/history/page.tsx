'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate, formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';

interface BookingHistory {
  id: string;
  start_date: string;
  end_date: string;
  total_hours: number;
  total_price: number;
  status: string;
  payment_status: string;
  vehicle: {
    name: string;
    type: string;
  };
}

export default function BookingHistoryPage() {
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const [bookings, setBookings] = useState<BookingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const fetchBookingHistory = async () => {
      if (!userId) return;
      
      try {
        const response = await fetch(`/api/admin/bookings/history?userId=${userId}`);
        if (!response.ok) throw new Error('Failed to fetch booking history');
        const data = await response.json();
        setBookings(data.bookings);
        setUserName(data.userName || 'User');
      } catch (error) {
        console.error('Error fetching booking history:', error);
        toast.error('Failed to load booking history');
      } finally {
        setLoading(false);
      }
    };

    fetchBookingHistory();
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#f26e24] border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Booking History</h1>
          <p className="text-gray-600">for {userName}</p>
        </div>
        <Button onClick={() => window.history.back()} variant="outline">
          Back to Bookings
        </Button>
      </div>

      {bookings.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-600">No booking history found for this user.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <Card key={booking.id} className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Vehicle</p>
                  <p className="font-medium">{booking.vehicle.name}</p>
                  <p className="text-sm text-gray-500">{booking.vehicle.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Duration</p>
                  <p className="font-medium">{formatDate(booking.start_date)}</p>
                  <p className="font-medium">{formatDate(booking.end_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount</p>
                  <p className="font-medium">{formatCurrency(booking.total_price)}</p>
                  <p className="text-sm text-gray-500">{booking.total_hours} hours</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <span className={`inline-block px-2 py-1 rounded-full text-sm ${
                    booking.status === 'completed' ? 'bg-green-100 text-green-800' :
                    booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                  <span className={`inline-block px-2 py-1 rounded-full text-sm mt-1 ${
                    booking.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
                    booking.payment_status === 'failed' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 