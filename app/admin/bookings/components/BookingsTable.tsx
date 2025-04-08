'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, History, X } from 'lucide-react';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { ViewBookingModal, type BookingWithRelations } from './ViewBookingModal';
import { ViewHistoryModal } from './ViewHistoryModal';
import { useToast } from '@/hooks/use-toast';
import logger from '@/lib/logger';
import { type users, type vehicles } from "@prisma/client";
import { type BookingStatus, type PaymentStatus } from "@/lib/types/booking";

const getStatusVariant = (status: BookingStatus): 'destructive' | 'success' | 'warning' => {
  switch (status) {
    case 'cancelled':
      return 'destructive';
    case 'confirmed':
    case 'completed':
    case 'initiated':
      return 'success';
    default:
      return 'warning';
  }
};

const getPaymentStatusVariant = (status: PaymentStatus): 'destructive' | 'success' | 'warning' => {
  switch (status) {
    case 'completed':
      return 'success';
    case 'failed':
      return 'destructive';
    default:
      return 'warning';
  }
};

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

      setBookings(result.data);
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
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    
    try {
      const response = await fetch(`/api/admin/bookings/${booking.id}/cancel`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to cancel booking');
      }
      
      toast({
        title: "Success",
        description: "Booking cancelled successfully",
      });
      
      fetchBookings();
    } catch (error) {
      logger.error('Error cancelling booking:', error);
      toast({
        title: "Error",
        description: "Failed to cancel booking",
        variant: "destructive"
      });
    }
  };

  const renderActions = (booking: BookingWithRelations) => {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={() => handleViewBooking(booking)}
          title="View Details"
          className="p-2 rounded hover:bg-gray-100"
        >
          <Eye className="w-4 h-4" />
          <span className="sr-only">View Details</span>
        </button>
        <button
          onClick={() => handleViewHistory(booking)}
          title="View History"
          className="p-2 rounded hover:bg-gray-100"
        >
          <History className="w-4 h-4" />
          <span className="sr-only">View History</span>
        </button>
        {booking.status !== 'cancelled' && booking.status !== 'completed' && (
          <button
            onClick={() => handleCancelBooking(booking)}
            title="Cancel Booking"
            className="p-2 rounded hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
            <span className="sr-only">Cancel Booking</span>
          </button>
        )}
      </div>
    );
  };

  if (error) {
    return (
      <div className="text-center py-6">
        <p className="text-red-600 font-medium">{error}</p>
        <Button onClick={fetchBookings} className="mt-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      <Card>
        <div className="w-full overflow-x-auto max-h-[calc(100vh-250px)] overflow-y-auto">
          <div className="px-4 py-3 bg-white border-b border-gray-200 flex justify-between items-center">
            <p className="text-sm text-gray-700 font-medium">{totalItems} bookings found</p>
          </div>
          <table className="w-full table-auto">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vehicle</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Start</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">End</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Payment</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Actions</th>
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
                    <td className="px-4 py-4 text-sm text-gray-900 font-medium">
                      {booking.booking_id}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-800">{booking.vehicle_name}</p>
                        <p className="text-gray-600">{booking.vehicle_type}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium text-gray-800">{booking.user_name}</p>
                          <p className="text-gray-600">{booking.user_email}</p>
                        </div>
                      </div>
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
                      <Badge variant={getStatusVariant(booking.status)}>
                        {booking.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <Badge variant={getPaymentStatusVariant(booking.payment_status)}>
                        {booking.payment_status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-sm">
                      {renderActions(booking)}
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
              <p className="text-sm text-gray-700 font-medium">
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