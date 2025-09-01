'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { formatCurrency } from '@/lib/utils/currency-formatter';

interface VehicleReturn {
  additional_charges: number;
  condition_notes?: string;
  created_at: string;
}

interface Booking {
  id: string;
  booking_id: string;
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
  vehicle_return?: VehicleReturn;
}

interface ViewBookingModalProps {
  booking: Booking;
  isOpen: boolean;
  onClose: () => void;
}

export function ViewBookingModal({ booking, isOpen, onClose }: ViewBookingModalProps) {
  // Helper function to calculate total amount
  const calculateTotalAmount = () => {
    const baseAmount = booking.total_price;
    const additionalCharges = booking.vehicle_return?.additional_charges || 0;
    return baseAmount + additionalCharges;
  };

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
                    : booking.payment_status === 'cancelled'
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
                <p className="text-sm text-gray-900">{booking.user?.name || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-xs text-gray-500">Phone</h4>
                <p className="text-sm text-gray-900">{booking.user?.phone || 'N/A'}</p>
              </div>
              <div>
                <h4 className="text-xs text-gray-500">Email</h4>
                <p className="text-sm text-gray-900">{booking.user?.email || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Vehicle Info */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Vehicle Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-xs text-gray-500">Vehicle</h4>
                <p className="text-sm text-gray-900">{booking.vehicle?.name || 'N/A'}</p>
              </div>
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
                <div>
                  <h4 className="text-xs text-gray-500">Base Amount</h4>
                  <p className="text-sm text-gray-900">{formatCurrency(booking.total_price)}</p>
                </div>
                {booking.vehicle_return?.additional_charges && booking.vehicle_return.additional_charges > 0 && (
                  <>
                    <div>
                      <h4 className="text-xs text-gray-500">Additional Charges</h4>
                      <p className="text-sm font-medium text-orange-600">
                        {formatCurrency(booking.vehicle_return.additional_charges)}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs text-gray-500">Total Amount</h4>
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(calculateTotalAmount())}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Vehicle Return Info */}
          {booking.vehicle_return && (
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Return Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs text-gray-500">Return Date</h4>
                  <p className="text-sm text-gray-900">
                    {formatDateTime(booking.vehicle_return?.created_at || '')}
                  </p>
                </div>
                {booking.vehicle_return?.condition_notes && (
                  <div className="col-span-2">
                    <h4 className="text-xs text-gray-500">Condition Notes</h4>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {booking.vehicle_return.condition_notes}
                    </p>
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