'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, History } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { ViewBookingModal } from './ViewBookingModal';
import { ViewHistoryModal } from './ViewHistoryModal';
import { toast } from 'sonner';
import logger from '@/lib/logger';
import { type Booking, type User, type Vehicle } from "@/lib/schema";
import { formatDate, formatTime } from '@/lib/utils/time-formatter';

interface BookingWithRelations {
  id: string;
  booking_id: string;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  payment_status: 'pending' | 'completed' | 'cancelled';
  payment_method?: string;
  payment_reference?: string;
  notes?: string;
  booking_type: 'online' | 'offline';
  created_at: string;
  updated_at: string;
  vehicle?: {
    id: string;
    name: string;
  };
  user?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  formatted_pickup?: string;
  formatted_dropoff?: string;
}

interface ViewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingWithRelations;
}

interface ViewHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingWithRelations;
}

interface BookingsTableProps {
  bookings: Booking[];
  users: User[];
  vehicles: Vehicle[];
}

export function BookingsTable() {
  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithRelations | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [currentPage]);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/bookings?page=${currentPage}`);
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch bookings');
      }

      // Map the data to match BookingWithRelations interface
      const mappedBookings = result.data.map((booking: any) => ({
        ...booking,
        vehicle: booking.vehicle,
        user: booking.user,
        start_date: booking.start_date,
        end_date: booking.end_date,
        total_price: parseFloat(booking.total_price) || 0,
        status: booking.status,
        payment_status: booking.payment_status || 'pending',
        payment_method: booking.payment_method,
        payment_reference: booking.payment_reference,
        booking_type: booking.booking_type || 'online'
      }));

      console.log('Mapped bookings:', mappedBookings);

      setBookings(mappedBookings);
      setTotalPages(result.pagination.totalPages);
      setTotalItems(result.pagination.totalItems);
    } catch (error) {
      logger.error('Error fetching bookings:', error);
      setError('Failed to load bookings');
      setBookings([]);
      setTotalPages(1);
      setTotalItems(0);
      toast.error("Error", {
        description: "Failed to load bookings",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewBooking = (booking: BookingWithRelations) => {
    setSelectedBooking(booking);
    setIsViewModalOpen(true);
  };

  const handleViewHistory = (booking: BookingWithRelations) => {
    setSelectedBooking(booking);
    setIsHistoryModalOpen(true);
  };

  const handleCancelBooking = async (booking: BookingWithRelations) => {
    try {
      // Store the original booking state
      const originalBooking = { ...booking };

      // Optimistically update the UI
      setBookings(prevBookings =>
        prevBookings.map(b =>
          b.booking_id === booking.booking_id
            ? {
              ...b,
              status: 'cancelled',
              payment_status: 'cancelled',
              updated_at: new Date().toISOString()
            }
            : b
        )
      );

      const response = await fetch(`/api/admin/bookings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          bookingId: booking.booking_id,
          action: 'cancel'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Revert the optimistic update on error
        setBookings(prevBookings =>
          prevBookings.map(b =>
            b.booking_id === booking.booking_id
              ? originalBooking
              : b
          )
        );
        throw new Error(data.error || 'Failed to cancel booking');
      }

      toast.success("Success", {
        description: "Booking cancelled successfully"
      });

      // Refresh the data to ensure consistency with server state
      await fetchBookings();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to cancel booking';
      logger.error('Error cancelling booking:', { error: errorMessage, bookingId: booking.booking_id });
      toast.error("Error", {
        description: errorMessage,
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'success';
      case 'confirmed':
        return 'confirmed';
      case 'active':
        return 'active';
      case 'cancelled':
        return 'destructive';
      case 'pending':
        return 'warning';
      case 'initiated':
        return 'confirmed';
      default:
        return 'secondary';
    }
  };

  if (error) {
    return (
      <div className="text-center py-4 text-red-500">
        <p>{error}</p>
        <Button onClick={fetchBookings} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <Card className="shadow-none border-0">
        <CardHeader className="px-4 py-3 space-y-1">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg">Booking Management</CardTitle>
              <CardDescription className="text-sm">{totalItems} bookings found</CardDescription>
            </div>
          </div>
        </CardHeader>

        <div className="w-full overflow-x-auto max-h-[calc(100vh-200px)] overflow-y-auto">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Booked On</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-20 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                      <span>Loading bookings...</span>
                    </div>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-20 text-center text-gray-500">
                    No bookings found
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id} className="border-b hover:bg-gray-50">
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {booking.booking_id || '—'}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium">{formatDate(booking.created_at)}</span>
                        <span className="text-gray-500">{formatTime(booking.created_at)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <div className="font-medium">{booking.vehicle?.name}</div>
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <div>
                        <div className="font-medium">{booking.user?.name}</div>
                        <div className="text-sm text-muted-foreground">{booking.user?.phone}</div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium">{formatDate(booking.start_date)}</span>
                        <span className="text-gray-500">{formatTime(booking.start_date)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-medium">{formatDate(booking.end_date)}</span>
                        <span className="text-gray-500">{formatTime(booking.end_date)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      {booking.total_price ? formatCurrency(booking.total_price) : '₹0'}
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <span className="text-gray-700 capitalize">
                        {booking.booking_type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <Badge
                        variant={getStatusBadgeVariant(booking.status)}
                        className="capitalize"
                      >
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <Badge
                        variant={
                          booking.payment_status === 'completed' ? 'success' :
                            booking.payment_status === 'pending' ? 'warning' :
                              'secondary'
                        }
                        className="capitalize"
                      >
                        {booking.booking_type === 'online' && booking.payment_status === 'completed' ?
                          '5% Collected' :
                          booking.payment_status
                        }
                      </Badge>
                    </td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleViewBooking(booking)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleViewHistory(booking)}
                        >
                          <History className="h-4 w-4" />
                        </Button>
                        {booking.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleCancelBooking(booking)}
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

        {totalPages > 1 && (
          <div className="flex justify-between items-center px-4 py-3 bg-gray-50 border-t">
            <div className="flex-1 text-sm text-gray-700">
              Showing page {currentPage} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
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
        )}
      </Card>

      {selectedBooking && (
        <>
          <ViewBookingModal
            isOpen={isViewModalOpen}
            onClose={() => setIsViewModalOpen(false)}
            booking={selectedBooking}
          />
          <ViewHistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            booking={selectedBooking}
          />
        </>
      )}
    </>
  );
} 