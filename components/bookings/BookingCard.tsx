import { format } from 'date-fns';
import Image from 'next/image';
import type { Booking, BookingStatus, PaymentStatus } from '@/lib/types/booking';

interface BookingCardProps {
  booking: Booking;
  onCancel: () => void;
}

export function BookingCard({ booking, onCancel }: BookingCardProps) {
  const canCancel = booking.status === 'pending';
  const formattedStartDate = format(new Date(booking.start_date), 'MMM d, yyyy h:mm a');
  const formattedEndDate = format(new Date(booking.end_date), 'MMM d, yyyy h:mm a');

  // Hardening: Ensure price is treated as a number for formatting
  const displayPrice = typeof booking.total_price === 'string'
    ? parseFloat(booking.total_price)
    : booking.total_price;

  const getStatusColor = (status: BookingStatus | string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'initiated':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus | string) => {
    const s = status?.toLowerCase();
    switch (s) {
      case 'completed':
      case 'fully_paid':
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
  };

  const formatPaymentStatus = (status: string) => {
    const s = status?.toLowerCase();
    if (s === 'fully_paid' || s === 'paid' || s === 'completed') return 'Paid';
    if (s === 'pending') return 'Payment Pending';
    return formatStatus(status);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {/* Vehicle Image */}
      {booking.vehicle?.images?.[0] && (
        <div className="relative w-full h-48">
          <Image
            src={booking.vehicle.images[0]}
            alt={booking.vehicle.name}
            fill
            className="object-cover"
          />
        </div>
      )}

      {/* Booking Details */}
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">{booking.vehicle?.name}</h3>

        <div className="space-y-2 text-sm">
          {/* Dates */}
          <div className="flex justify-between">
            <div>
              <p className="text-gray-600 text-xs">Start Date</p>
              <p className="font-medium">{formattedStartDate}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-600 text-xs">End Date</p>
              <p className="font-medium">{formattedEndDate}</p>
            </div>
          </div>

          {/* Location */}
          {(booking.pickup_location || booking.vehicle?.location) && (
            <div>
              <p className="text-gray-600 text-xs">Location</p>
              <p className="font-medium">{booking.pickup_location || (Array.isArray(booking.vehicle?.location) ? booking.vehicle.location[0] : booking.vehicle?.location)}</p>
            </div>
          )}

          {/* Price */}
          <div className="flex justify-between items-center py-2 border-t border-gray-100">
            <p className="text-gray-600">Total Price</p>
            <p className="text-lg font-bold text-indigo-600">₹{(displayPrice || 0).toLocaleString('en-IN')}</p>
          </div>

          {/* Status */}
          <div className="flex justify-between items-center pt-2">
            <div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                {formatStatus(booking.status)}
              </span>
            </div>

            {/* Payment Status */}
            <div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(booking.payment_status)}`}>
                {formatPaymentStatus(booking.payment_status)}
              </span>
            </div>
          </div>

          {/* Cancel Button */}
          {canCancel && (
            <button
              onClick={onCancel}
              className="mt-4 w-full py-2 px-4 text-sm font-medium text-red-600 hover:text-red-800 border border-red-600 hover:border-red-800 rounded-full transition-colors"
            >
              Cancel Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}