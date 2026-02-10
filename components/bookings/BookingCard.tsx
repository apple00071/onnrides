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

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          <div>
            <p className="text-gray-600">Start Date</p>
            <p className="font-medium">{formattedStartDate}</p>
          </div>
          <div>
            <p className="text-gray-600">End Date</p>
            <p className="font-medium">{formattedEndDate}</p>
          </div>

          {/* Location */}
          {(booking.pickup_location || booking.vehicle?.location) && (
            <div>
              <p className="text-gray-600">Location</p>
              <p className="font-medium">{booking.pickup_location || booking.vehicle?.location}</p>
            </div>
          )}

          {/* Price */}
          <div>
            <p className="text-gray-600">Total Price</p>
            <p className="font-medium">₹{booking.total_price}</p>
          </div>

          {/* Status */}
          <div className="flex justify-between items-center pt-2">
            <div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(booking.status)}`}>
                {booking.status}
              </span>
            </div>

            {/* Payment Status */}
            <div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPaymentStatusColor(booking.payment_status)}`}>
                {booking.payment_status}
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