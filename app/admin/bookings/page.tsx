'use client';

import logger from '@/lib/logger';
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { format, isValid, parseISO } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { toast } from 'react-hot-toast';
import { formatCurrency, formatDateToIST } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Eye, History, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';

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
  updated_at: string;
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
  payment_reference?: string;  // Add payment reference
  payment_details?: any;       // Add payment details
  formatted_pickup?: string;   // Add formatted pickup date
  formatted_dropoff?: string;  // Add formatted dropoff date
}

// Format date and time - using database formatted values when available
const formatDateTime = (dateString: string | null | undefined) => {
  if (!dateString) return 'Not available';
  try {
    // If the date string already includes AM/PM, it's likely already formatted from the database
    if (typeof dateString === 'string' && (dateString.includes('AM') || dateString.includes('PM'))) {
      return dateString;
    }

    // For dates without AM/PM, parse and format with Indian locale and 12-hour time
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    logger.error('Error formatting date', { dateString, error });
    return dateString || 'Date error';
  }
};

// Format location from various possible formats
const formatLocation = (location: string | string[] | null | undefined) => {
  if (!location) return 'Location not available';
  
  try {
    // Handle array
    if (Array.isArray(location)) {
      return location[0] || 'Location not available';
    }
    
    // Handle JSON string
    if (typeof location === 'string' && (location.startsWith('[') || location.startsWith('{'))) {
      const parsed = JSON.parse(location);
      if (Array.isArray(parsed)) {
        return parsed[0] || 'Location not available';
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return parsed.name || parsed.toString() || 'Location not available';
      }
    }
    
    // Handle plain string
    return location.toString();
  } catch (error) {
    logger.error('Error formatting location', { location, error });
    return typeof location === 'string' ? location : 'Location not available';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch bookings with pagination
  const fetchBookings = async (page: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/bookings?page=${page}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const responseData = await response.json();
      if (!responseData.success) {
        throw new Error(responseData.error || 'Failed to fetch bookings');
      }

      // Transform the data to match our Booking type
      const transformedBookings = responseData.data.map((booking: any) => ({
        id: booking.id,
        booking_id: booking.booking_id,
        user_id: booking.user_id,
        vehicle_id: booking.vehicle_id,
        start_date: booking.ist_start_date || booking.start_date,
        end_date: booking.ist_end_date || booking.end_date,
        pickup_datetime: booking.ist_start_date || booking.start_date,
        dropoff_datetime: booking.ist_end_date || booking.end_date,
        formatted_pickup: booking.formatted_pickup,
        formatted_dropoff: booking.formatted_dropoff,
        total_price: booking.total_price,
        status: booking.status,
        payment_status: booking.payment_status,
        created_at: booking.ist_created_at || booking.created_at,
        updated_at: booking.ist_updated_at || booking.updated_at,
        vehicle: {
          name: booking.vehicle_name,
          location: booking.vehicle_location
        },
        user: {
          name: booking.user_name,
          email: booking.user_email,
          phone: booking.user_phone
        }
      }));

      setBookings(transformedBookings);
      setCurrentPage(responseData.pagination?.currentPage || 1);
      setTotalPages(responseData.pagination?.totalPages || 1);
      setTotalItems(responseData.pagination?.totalItems || 0);
    } catch (err) {
      logger.error('Error fetching bookings:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch bookings');
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  // Fetch bookings on mount and page change
  useEffect(() => {
    fetchBookings(currentPage);
  }, [currentPage]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

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
    console.log('Viewing booking details:', {
      id: booking.id, 
      bookingId: booking.booking_id,
      formattedPickup: booking.formatted_pickup,
      formattedDropoff: booking.formatted_dropoff,
      startDate: booking.start_date,
      endDate: booking.end_date
    });
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
      setLoading(true);
      
      const response = await fetch('/api/admin/bookings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingId: selectedBooking.booking_id,
          action: 'cancel'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking');
      }

      // Close modal and refresh bookings
      setShowCancelDialog(false);
      setSelectedBooking(null);
      toast.success('Booking cancelled successfully');
      fetchBookings(currentPage);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel booking';
      logger.error('Error cancelling booking:', { error: errorMessage });
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="w-full py-8">
        <h1 className="text-2xl font-bold mb-6">Bookings Management</h1>
        
        <div className="text-center py-8">
          <p className="text-red-500">{error}</p>
          <button 
            onClick={() => fetchBookings(1)} 
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Booking Management</CardTitle>
                <CardDescription>{totalItems} bookings found</CardDescription>
              </div>
            </div>
          </CardHeader>

          <div className="w-full overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto">
            <table className="w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pickup</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dropoff</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-4 text-center">
                      <div className="flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    </td>
                  </tr>
                ) : bookings.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-4 text-center text-gray-500">
                      No bookings found
                    </td>
                  </tr>
                ) : (
                  bookings.map((booking) => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {booking.booking_id}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {booking.vehicle?.name || 'N/A'}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div>{booking.user?.name || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{booking.user?.phone || 'N/A'}</div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {booking.formatted_pickup || formatDateTime(booking.pickup_datetime || booking.start_date)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {booking.formatted_dropoff || formatDateTime(booking.dropoff_datetime || booking.end_date)}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {formatCurrency(booking.total_price)}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : booking.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          booking.payment_status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : booking.payment_status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {booking.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <div className="flex space-x-2">
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {!loading && bookings.length > 0 && (
            <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
              <div className="flex-1 flex justify-between items-center">
                <p className="text-sm text-gray-700">
                  Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalItems)} of {totalItems} bookings
                </p>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex space-x-1">
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      const page = i + 1;
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
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
                  <h3 className="text-base font-semibold mb-1">Vehicle</h3>
                  <p>{selectedBooking.vehicle?.name || 'Vehicle name not available'}</p>
                  <p className="text-gray-600">Booking ID: {selectedBooking.booking_id}</p>
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1">Customer</h3>
                  <p>{selectedBooking.user?.name || 'Customer name not available'}</p>
                  <p className="text-gray-600">{selectedBooking.user?.email || 'Email not available'}</p>
                  <p className="text-gray-600">Phone: {selectedBooking.user?.phone || 'N/A'}</p>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold mb-1">Location</h3>
                <p>{formatLocation(selectedBooking.location || '')}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-base font-semibold mb-1">Pickup Time</h3>
                  <p>{selectedBooking.formatted_pickup || formatDateTime(selectedBooking.pickup_datetime || selectedBooking.start_date)}</p>
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1">Dropoff Time</h3>
                  <p>{selectedBooking.formatted_dropoff || formatDateTime(selectedBooking.dropoff_datetime || selectedBooking.end_date)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-base font-semibold mb-1">Duration</h3>
                  <p>{selectedBooking.total_hours || 0} hours</p>
                </div>
                <div>
                  <h3 className="text-base font-semibold mb-1">Amount</h3>
                  <p>₹{selectedBooking.total_price || 0}</p>
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold mb-1">Status</h3>
                <span className={`inline-block px-3 py-1 rounded-full text-xs ${
                  selectedBooking.status === 'cancelled'
                    ? 'bg-red-100 text-red-800'
                    : selectedBooking.payment_status === 'completed'
                    ? 'bg-green-100 text-green-800'
                    : selectedBooking.payment_status === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {selectedBooking.status === 'cancelled'
                    ? 'Cancelled'
                    : selectedBooking.payment_status === 'completed'
                    ? 'Confirmed'
                    : selectedBooking.payment_status === 'pending'
                    ? 'Payment Pending'
                    : selectedBooking.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-semibold mb-1">Payment Information</h3>
                {selectedBooking.payment_status === 'completed' ? (
                  <div className="space-y-1">
                    <p className="text-gray-600">
                      <span className="font-medium">Payment ID:</span>{' '}
                      {selectedBooking.payment_reference || 'N/A'}
                    </p>
                    {selectedBooking.payment_details && (
                      <p className="text-gray-600">
                        <span className="font-medium">Order ID:</span>{' '}
                        {selectedBooking.payment_details.razorpay_order_id || 'N/A'}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600">No payment information available</p>
                )}
              </div>

              <div>
                <h3 className="text-base font-semibold mb-1">Created</h3>
                <p>{formatDateTime(selectedBooking.created_at)}</p>
              </div>

              <div>
                <h3 className="text-base font-semibold mb-1">Last Updated</h3>
                <p>{selectedBooking.updated_at ? formatDateTime(selectedBooking.updated_at) : 'Date not available'}</p>
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
                      <h4 className="font-medium">{booking.vehicle?.name || 'Vehicle name not available'}</h4>
                      <div className="mt-2 space-y-1 text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Pickup:</span>{' '}
                          {booking.formatted_pickup || formatDateTime(booking.start_date || booking.pickup_datetime)}
                        </p>
                        <p>
                          <span className="font-medium">Dropoff:</span>{' '}
                          {booking.formatted_dropoff || formatDateTime(booking.end_date || booking.dropoff_datetime)}
                        </p>
                        <p>
                          <span className="font-medium">Location:</span>{' '}
                          {formatLocation(booking.location || '')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-orange-500">
                        {formatCurrency(booking.total_price || 0)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {formatDateTime(booking.created_at || null)}
                      </p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                        booking.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {(booking.status || 'pending').charAt(0).toUpperCase() + (booking.status || 'pending').slice(1)}
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