'use client';

import logger from '@/lib/logger';
import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
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
import { utcToZonedTime } from 'date-fns-tz';
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
      logger.debug('Fetching admin bookings, page:', page);
      
      const response = await fetch(`/api/admin/bookings?page=${page}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch bookings');
      }

      const data = await response.json();
      logger.debug('Admin bookings API response:', data);
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch bookings');
      }

      // Transform the flat data into the expected nested structure
      const transformedBookings = (data.data || []).map((booking: any) => {
        // Log debug information for each booking's date fields
        logger.debug(`Booking ${booking.booking_id} time data:`, {
          formatted_pickup: booking.formatted_pickup,
          formatted_dropoff: booking.formatted_dropoff,
          db_start_time: booking.db_start_time,
          ist_start_time: booking.ist_start_time,
          calculated_duration: booking.calculated_duration_hours
        });
        
        // Create a properly structured booking object from the flat API response
        return {
          ...booking,
          // Convert flat fields to nested objects
          user: {
            name: booking.user_name,
            email: booking.user_email,
            phone: booking.user_phone
          },
          vehicle: {
            name: booking.vehicle_name
          },
          // Map location field
          location: booking.vehicle_location,
          // Map pickup/dropoff datetime fields using IST converted values
          pickup_datetime: booking.ist_start_date || booking.start_date,
          dropoff_datetime: booking.ist_end_date || booking.end_date,
          // Ensure created_at is the IST version 
          created_at: booking.ist_created_at || booking.created_at,
          updated_at: booking.ist_updated_at || booking.updated_at
        };
      });
      
      logger.debug('Transformed bookings data:', { 
        bookingsCount: transformedBookings.length,
        sampleBooking: transformedBookings[0] ? {
          id: transformedBookings[0].id,
          booking_id: transformedBookings[0].booking_id,
          formatted_pickup: transformedBookings[0].formatted_pickup,
          formatted_dropoff: transformedBookings[0].formatted_dropoff
        } : 'No bookings'
      });
      
      setBookings(transformedBookings);
      setCurrentPage(data.pagination?.currentPage || 1);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotalItems(data.pagination?.totalItems || 0);
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
      <div className="container mx-auto py-8">
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
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Bookings Management</h1>
      
      {loading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <p className="text-red-500">{error}</p>
          <button 
            onClick={() => fetchBookings(1)} 
            className="mt-4 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No bookings found</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="grid gap-6">
              {bookings.map((booking) => (
                <Card key={booking.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row justify-between gap-4">
                    <div>
                      <h3 className="font-semibold mb-2">
                        {booking.vehicle?.name || 'Vehicle info not available'}
                        <span className="ml-2 text-sm text-gray-500">
                          #{booking.booking_id || 'No ID'}
                        </span>
                      </h3>
                      <p className="text-sm text-gray-600 mb-1">
                        Customer: {booking.user?.name || 'Name not available'}
                      </p>
                      <p className="text-sm text-gray-600 mb-1">
                        Email: {booking.user?.email || 'Email not available'}
                      </p>
                      <p className="text-sm text-gray-600 mb-2">
                        Phone: {booking.user?.phone || 'N/A'}
                      </p>
                      <div className="mt-2 text-sm text-gray-600">
                        <div className="flex flex-col gap-2">
                          <div>
                            <span className="font-semibold">Pickup:</span>{' '}
                            {booking.formatted_pickup || formatDateTime(booking.pickup_datetime || booking.start_date)}
                          </div>
                          <div>
                            <span className="font-semibold">Drop-off:</span>{' '}
                            {booking.formatted_dropoff || formatDateTime(booking.dropoff_datetime || booking.end_date)}
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
                        booking.status === 'cancelled'
                          ? 'bg-red-100 text-red-800'
                          : booking.payment_status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : booking.payment_status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {booking.status === 'cancelled'
                          ? 'Cancelled'
                          : booking.payment_status === 'completed'
                          ? 'Confirmed'
                          : booking.payment_status === 'pending'
                          ? 'Payment Pending'
                          : booking.status}
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
          </div>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalItems)} of {totalItems} bookings
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 rounded ${
                    currentPage === page
                      ? 'bg-[#f26e24] text-white'
                      : 'border border-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}

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
                  <p className="text-gray-600">Booking ID: {selectedBooking.booking_id || 'N/A'}</p>
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
    </div>
  );
} 