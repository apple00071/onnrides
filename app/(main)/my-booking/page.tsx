'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { toast } from 'react-hot-toast';
import logger from '@/lib/logger';

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
}

export default function MyBooking() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const response = await fetch('/api/user/current-booking');
        if (!response.ok) {
          throw new Error('Failed to fetch booking');
        }
        const data = await response.json();
        setBooking(data.booking);
      } catch (error) {
        logger.error('Error fetching booking:', error);
        toast.error('Failed to load booking details. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchBooking();
    } else {
      setLoading(false);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <p className="text-gray-600 mb-4">Please log in to view your booking.</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">My Booking</h1>
        <div className="bg-white rounded-lg shadow-md p-6">
          <p className="text-gray-600">You don&apos;t have any active bookings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">My Booking</h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">{booking.vehicle_name}</h2>
            <div className="space-y-2">
              <p><span className="font-medium">Pickup:</span> {new Date(booking.pickup_datetime).toLocaleString()}</p>
              <p><span className="font-medium">Dropoff:</span> {new Date(booking.dropoff_datetime).toLocaleString()}</p>
              <p><span className="font-medium">From:</span> {booking.pickup_location}</p>
              <p><span className="font-medium">To:</span> {booking.drop_location}</p>
            </div>
          </div>
          <div>
            <div className="space-y-2">
              <p><span className="font-medium">Status:</span> <span className="capitalize">{booking.status}</span></p>
              <p><span className="font-medium">Payment Status:</span> <span className="capitalize">{booking.payment_status}</span></p>
              <p><span className="font-medium">Total Amount:</span> ₹{booking.total_amount}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 