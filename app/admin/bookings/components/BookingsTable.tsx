'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, History } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { ViewBookingModal } from './ViewBookingModal';
import { ViewHistoryModal } from './ViewHistoryModal';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { type bookings, type users, type vehicles } from "@prisma/client";

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
  const { toast } = useToast();

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
        id: booking.id,
        booking_id: booking.booking_id || '',
        user_id: booking.user_id,
        vehicle_id: booking.vehicle_id,
        start_date: booking.original_start_date,
        end_date: booking.original_end_date,
        total_price: booking.total_price || 0,
        status: booking.status,
        payment_status: booking.payment_status || 'pending',
        payment_method: booking.payment_method,
        payment_reference: booking.payment_reference,
        notes: booking.notes,
        booking_type: booking.booking_type || 'online',
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        vehicle: booking.vehicle_name ? {
          id: booking.vehicle_id,
          name: booking.vehicle_name
        } : undefined,
        user: booking.user_name ? {
          id: booking.user_id,
          name: booking.user_name,
          phone: booking.user_phone || '',
          email: booking.user_email
        } : undefined
      }));

      setBookings(mappedBookings);
      setTotalPages(result.pagination.totalPages);
      setTotalItems(result.pagination.totalItems);
    } catch (error) {
      logger.error('Error fetching bookings:', error);
      setError('Failed to load bookings');
      setBookings([]);
      setTotalPages(1);
      setTotalItems(0);
      toast({
        title: "Error",
        description: "Failed to load bookings",
        variant: "destructive"
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
      const response = await fetch(`/api/admin/bookings/${booking.id}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }

      await fetchBookings();
      toast({
        title: "Success",
        description: "Booking cancelled successfully"
      });
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive"
      });
    }
  };

  if (error) {
    return (
      <div className="text-center py-6 text-red-500">
        <p>{error}</p>
        <Button onClick={fetchBookings} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">End</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-4 text-center">
                    <div className="flex justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  </td>
                </tr>
              ) : !bookings || bookings.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-4 text-center text-gray-500">
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
                      {formatDateTime(booking.start_date)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {formatDateTime(booking.end_date)}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(booking.total_price)}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <Badge variant={booking.booking_type === 'offline' ? 'secondary' : 'default'}>
                        {booking.booking_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <Badge
                        variant={
                          booking.status === 'cancelled'
                            ? 'destructive'
                            : booking.status === 'confirmed'
                            ? 'success'
                            : 'warning'
                        }
                      >
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <Badge
                        variant={
                          booking.payment_status === 'completed'
                            ? 'success'
                            : booking.payment_status === 'cancelled'
                            ? 'destructive'
                            : 'warning'
                        }
                      >
                        {booking.payment_status}
                      </Badge>
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

        {/* Pagination */}
        {!loading && bookings.length > 0 && (
          <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between items-center">
              <p className="text-sm text-gray-700">
                Showing page {currentPage} of {totalPages}
              </p>
              <div className="space-x-2">
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
          </div>
        )}
      </Card>

      {/* View Booking Modal */}
      {selectedBooking && (
        <ViewBookingModal
          booking={selectedBooking}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedBooking(null);
          }}
        />
      )}

      {/* View History Modal */}
      {selectedBooking && (
        <ViewHistoryModal
          booking={selectedBooking}
          isOpen={isHistoryModalOpen}
          onClose={() => {
            setIsHistoryModalOpen(false);
            setSelectedBooking(null);
          }}
        />
      )}
    </>
  );
} 