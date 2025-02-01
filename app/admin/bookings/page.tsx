'use client';

import { logger } from '@/lib/logger';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { format, isValid, parseISO, addMinutes } from 'date-fns';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Eye, History } from 'lucide-react';

interface Booking {
  id: string;
  booking_id: string;
  user_id: string;
  vehicle_id: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  start_date?: string;  // For backward compatibility
  end_date?: string;    // For backward compatibility
  total_hours: number;
  total_price: number;
  status: string;
  created_at: string;
  location: string;
  user: {
    name: string;
    email: string;
    phone: string;
  };
  vehicle: {
    name: string;
  };
  payment_status: string;
}

const formatDateTime = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    const date = parseISO(dateStr);
    const dateWithOffset = addMinutes(date, 330); // Add 5 hours and 30 minutes for Indian timezone
    return format(dateWithOffset, 'MMM d, yyyy hh:mm a');
  } catch (error) {
    logger.error('Error formatting date:', error);
    return 'Invalid Date';
  }
};

const formatLocation = (location: string | string[]) => {
  try {
    if (typeof location === 'string') {
      const parsed = JSON.parse(location);
      return Array.isArray(parsed) ? parsed[0] : parsed;
    }
    return Array.isArray(location) ? location[0] : location;
  } catch (e) {
    return location || 'N/A';
  }
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [userHistory, setUserHistory] = useState<Booking[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Fetch all bookings
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/admin/bookings');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch bookings');
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.message || 'Failed to fetch bookings');
        }

        setBookings(data.bookings || []);
      } catch (err) {
        logger.error('Error fetching bookings:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
        toast.error('Failed to load bookings');
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, []);

  // Fetch user history when needed
  const fetchUserHistory = async (userId: string) => {
    try {
      setLoadingHistory(true);
      const response = await fetch(`/api/admin/bookings/history?userId=${userId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch user history');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch user history');
      }

      setUserHistory(data.bookings || []);
    } catch (err) {
      logger.error('Error fetching user history:', err);
      toast.error('Failed to load user history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleViewBooking = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowViewModal(true);
  };

  const handleViewHistory = async (booking: Booking) => {
    setSelectedBooking(booking);
    await fetchUserHistory(booking.user_id);
    setShowHistoryModal(true);
  };

  const handleCancelClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setShowCancelDialog(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedBooking) return;

    try {
      const response = await fetch(`/api/admin/bookings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          action: 'cancel'
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      // Update the local state
      setBookings(bookings.map(booking => 
        booking.id === selectedBooking.id 
          ? { ...booking, status: 'cancelled' }
          : booking
      ));

      toast.success('Booking cancelled successfully');
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    } finally {
      setShowCancelDialog(false);
      setSelectedBooking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-6 text-center m-4">
        <p className="text-red-500">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
        >
          Try Again
        </button>
      </Card>
    );
  }

  return (
    <>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8">Bookings</h1>

        {!bookings || bookings.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-gray-600">No bookings found.</p>
          </Card>
        ) : (
          <div className="grid gap-6">
            {bookings.map((booking) => (
              <Card key={booking.id} className="p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row justify-between gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">
                      {booking.vehicle.name}
                      <span className="ml-2 text-sm text-gray-500">
                        #{booking.booking_id}
                      </span>
                    </h3>
                    <p className="text-sm text-gray-600 mb-1">
                      Customer: {booking.user.name}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      Email: {booking.user.email}
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      Phone: {booking.user.phone || 'N/A'}
                    </p>
                    <div className="mt-2 text-sm text-gray-600">
                      <div className="flex flex-col gap-2">
                        <div>
                          <span className="font-semibold">Pickup:</span>{' '}
                          {formatDateTime(booking.pickup_datetime)}
                        </div>
                        <div>
                          <span className="font-semibold">Drop-off:</span>{' '}
                          {formatDateTime(booking.dropoff_datetime)}
                        </div>
                        <div>
                          <span className="font-semibold">Location:</span>{' '}
                          {formatLocation(booking.location)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-orange-500">
                      {formatCurrency(booking.total_price)}
                    </p>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(booking.created_at)}
                    </p>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                      booking.status === 'confirmed' && booking.payment_status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : booking.status === 'cancelled'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {booking.status === 'confirmed' && booking.payment_status === 'completed'
                        ? 'Confirmed'
                        : booking.status === 'confirmed'
                        ? 'Pending Payment'
                        : booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                    <div className="mt-2 space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewBooking(booking)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewHistory(booking)}
                      >
                        <History className="h-4 w-4 mr-1" />
                      History
                      </Button>
                      {booking.status !== 'cancelled' && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancelClick(booking)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* View Booking Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Vehicle</h3>
                  <p>{selectedBooking.vehicle.name}</p>
                  <p className="text-sm text-gray-500">Booking ID: {selectedBooking.booking_id}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Customer</h3>
                  <p>{selectedBooking.user.name}</p>
                  <p className="text-sm text-gray-600">{selectedBooking.user.email}</p>
                  <p className="text-sm text-gray-600">Phone: {selectedBooking.user.phone || 'N/A'}</p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Location</h3>
                <p>{formatLocation(selectedBooking.location)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Pickup Time</h3>
                  <p className="text-gray-600">{formatDateTime(selectedBooking.pickup_datetime)}</p>
                </div>
                <div>
                  <h3 className="font-semibold">Dropoff Time</h3>
                  <p className="text-gray-600">{formatDateTime(selectedBooking.dropoff_datetime)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold">Duration</h3>
                  <p>{selectedBooking.total_hours} hours</p>
                </div>
                <div>
                  <h3 className="font-semibold">Amount</h3>
                  <p className="text-orange-500 font-medium">
                    {formatCurrency(selectedBooking.total_price)}
                  </p>
                </div>
              </div>
              <div>
                <h3 className="font-semibold">Status</h3>
                <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                  selectedBooking.status === 'completed' 
                    ? 'bg-green-100 text-green-800'
                    : selectedBooking.status === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {selectedBooking.status.charAt(0).toUpperCase() + selectedBooking.status.slice(1)}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Modal */}
      <Dialog open={showHistoryModal} onOpenChange={setShowHistoryModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking History</DialogTitle>
          </DialogHeader>
          {loadingHistory ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-orange-500"></div>
            </div>
          ) : userHistory.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No booking history found</p>
          ) : (
            <div className="space-y-4">
              {userHistory.map((booking) => (
                <Card key={booking.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{booking.vehicle.name}</h4>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Pickup:</span>{' '}
                          {formatDateTime(booking.start_date || booking.pickup_datetime)}
                        </p>
                        <p>
                          <span className="font-medium">Dropoff:</span>{' '}
                          {formatDateTime(booking.end_date || booking.dropoff_datetime)}
                        </p>
                        <p>
                          <span className="font-medium">Location:</span>{' '}
                          {formatLocation(booking.location)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-orange-500">
                        {formatCurrency(booking.total_price)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(booking.created_at)}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        booking.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Booking</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
            >
              No, keep it
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
            >
              Yes, cancel booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 