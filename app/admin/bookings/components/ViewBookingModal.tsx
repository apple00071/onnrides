'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { type bookings, type users, type vehicles } from "@prisma/client";
import { type BookingStatus, type PaymentStatus } from "@/lib/types/booking";

export interface BookingWithRelations extends Omit<bookings, 'status' | 'payment_status' | 'booking_id'> {
  users: users;
  status: BookingStatus;
  payment_status: PaymentStatus;
  booking_id: string | null;
  booking_type: 'online' | 'offline';
  payment_method?: string;
  payment_reference?: string;
  payment_details: string | null;
  notes?: string;
  vehicle_name: string;
  vehicle_type: string;
  vehicle_location?: string;
  user_name: string;
  user_email: string;
  user_phone?: string;
}

interface ViewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: BookingWithRelations;
}

export function ViewBookingModal({ booking, isOpen, onClose }: ViewBookingModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Booking ID</h3>
              <p className="mt-1 text-sm text-gray-900">{booking.booking_id}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Type</h3>
              <Badge
                variant={booking.booking_type === 'offline' ? 'secondary' : 'default'}
                className="mt-1"
              >
                {booking.booking_type}
              </Badge>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <Badge
                variant={
                  booking.status === 'cancelled'
                    ? 'destructive'
                    : booking.status === 'confirmed'
                    ? 'success'
                    : 'warning'
                }
                className="mt-1"
              >
                {booking.status}
              </Badge>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Payment Status</h3>
              <Badge
                variant={
                  booking.payment_status === 'completed'
                    ? 'success'
                    : booking.payment_status === 'failed'
                    ? 'destructive'
                    : 'warning'
                }
                className="mt-1"
              >
                {booking.payment_status}
              </Badge>
            </div>
          </div>

          {/* Customer Info */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs text-gray-500">Name</h4>
                <p className="text-sm text-gray-900">{booking.user_name || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-xs text-gray-500">Phone</h4>
                <p className="text-sm text-gray-900">{booking.user_phone || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-xs text-gray-500">Email</h4>
                <p className="text-sm text-gray-900">{booking.user_email || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Vehicle Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs text-gray-500">Vehicle</h4>
                <p className="text-sm text-gray-900">{booking.vehicle_name || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-xs text-gray-500">Type</h4>
                <p className="text-sm text-gray-900">{booking.vehicle_type || 'N/A'}</p>
              </div>
              {booking.vehicle_location && (
                <div>
                  <h4 className="text-xs text-gray-500">Location</h4>
                  <p className="text-sm text-gray-900">{booking.vehicle_location}</p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Details */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Booking Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs text-gray-500">Start Date & Time</h4>
                <p className="text-sm text-gray-900">{formatDateTime(booking.start_date)}</p>
              </div>
              <div>
                <h4 className="text-xs text-gray-500">End Date & Time</h4>
                <p className="text-sm text-gray-900">{formatDateTime(booking.end_date)}</p>
              </div>
              <div>
                <h4 className="text-xs text-gray-500">Total Amount</h4>
                <p className="text-sm font-medium text-gray-900">
                  {formatCurrency(booking.total_price)}
                </p>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          {(booking.payment_method || booking.payment_reference) && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Payment Information</h3>
              <div className="grid grid-cols-2 gap-4">
                {booking.payment_method && (
                  <div>
                    <h4 className="text-xs text-gray-500">Payment Method</h4>
                    <p className="text-sm text-gray-900">{booking.payment_method}</p>
                  </div>
                )}
                {booking.payment_reference && (
                  <div>
                    <h4 className="text-xs text-gray-500">Payment Reference</h4>
                    <p className="text-sm text-gray-900">{booking.payment_reference}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Additional Notes</h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">{booking.notes}</p>
            </div>
          )}

          {/* Timestamps */}
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
            <div>Created: {formatDateTime(booking.created_at)}</div>
            <div>Last Updated: {formatDateTime(booking.updated_at)}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 