'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { ArrowLeft } from 'lucide-react';
import { BookingActions } from '@/components/bookings/BookingActions';

interface BookingDetails {
  id: string;
  booking_id: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    alternate_phone?: string;
    aadhar_number?: string;
    father_number?: string;
    mother_number?: string;
    date_of_birth?: string;
    dl_number?: string;
    dl_expiry_date?: string;
    permanent_address?: string;
    documents?: {
      dl_scan?: string;
      aadhar_scan?: string;
      selfie?: string;
    };
  };
  vehicle: {
    name: string;
    type: string;
    model?: string;
    registration_number?: string;
  };
  amount: number;
  rental_amount?: number;
  security_deposit_amount?: number;
  total_amount?: number;
  paid_amount?: number;
  pending_amount?: number;
  payment_method?: string;
  payment_reference?: string;
  status: string;
  payment_status: string;
  booking_type: string;
  duration: {
    from: string;
    to: string;
  };
  vehicle_return?: {
    additional_charges: number;
    condition_notes: string;
    return_date: string;
  };
  notes?: string;
  terms_accepted?: boolean;
}

export default function BookingDetailsPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const resolvedParams = use(params);
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchBookingDetails();
  }, [resolvedParams.bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/bookings/${resolvedParams.bookingId}`);
      const result = await response.json();

      if (result.success) {
        setBooking(result.data);
      } else {
        setError(result.error || 'Failed to fetch booking details');
      }
    } catch (error) {
      console.error('Error fetching booking details:', error);
      setError('Failed to fetch booking details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f26e24]"></div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900">Booking not found</h2>
          <button
            onClick={() => router.back()}
            className="mt-4 text-[#f26e24] hover:text-[#d95e1d] flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={20} /> Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-[#f26e24] hover:text-[#d95e1d] flex items-center gap-2"
        >
          <ArrowLeft size={20} /> Back to Bookings
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-semibold">Booking Details</h1>
            <p className="text-gray-600">Booking ID: {booking.booking_id}</p>
          </div>
          <div className="flex gap-2">
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              booking.status === 'completed' ? 'bg-green-100 text-green-800' :
              booking.status === 'cancelled' ? 'bg-red-100 text-red-800' :
              booking.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </span>
            <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
              booking.payment_status === 'completed' ? 'bg-green-100 text-green-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              Payment: {booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Vehicle Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Vehicle Details</h3>
              <p className="mt-1 text-lg font-semibold">{booking.vehicle.name}</p>
              <p className="text-gray-600">{booking.vehicle.type}</p>
              {booking.vehicle.model && (
                <p className="text-gray-600">Model: {booking.vehicle.model}</p>
              )}
              {booking.vehicle.registration_number && (
                <p className="text-gray-600">Registration: {booking.vehicle.registration_number}</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Booking Type</h3>
              <p className="mt-1 capitalize">{booking.booking_type}</p>
            </div>
          </div>

          {/* Customer Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Customer Details</h3>
              <div className="mt-2 space-y-2">
                <p className="font-semibold">{booking.customer.name}</p>
                <p className="text-gray-600">📞 {booking.customer.phone}</p>
                {booking.customer.alternate_phone && (
                  <p className="text-gray-600">📞 Alt: {booking.customer.alternate_phone}</p>
                )}
                {booking.customer.email && (
                  <p className="text-gray-600">✉️ {booking.customer.email}</p>
                )}
              </div>
            </div>

            {/* Additional Customer Info for Offline Bookings */}
            {booking.booking_type === 'offline' && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Verification Details</h3>
                <div className="mt-2 space-y-1 text-sm">
                  {booking.customer.dl_number && (
                    <p>DL Number: {booking.customer.dl_number}</p>
                  )}
                  {booking.customer.aadhar_number && (
                    <p>Aadhar: {booking.customer.aadhar_number}</p>
                  )}
                  {booking.customer.date_of_birth && (
                    <p>DOB: {formatDateTime(booking.customer.date_of_birth)}</p>
                  )}
                  {booking.customer.father_number && (
                    <p>Father's Phone: {booking.customer.father_number}</p>
                  )}
                  {booking.customer.mother_number && (
                    <p>Mother's Phone: {booking.customer.mother_number}</p>
                  )}
                  {booking.customer.permanent_address && (
                    <p>Address: {booking.customer.permanent_address}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Payment and Duration Information */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Duration</h3>
              <p className="mt-1">From: {formatDateTime(booking.duration.from)}</p>
              <p className="mt-1">To: {formatDateTime(booking.duration.to)}</p>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-500">Payment Details</h3>
              <div className="mt-2 space-y-1">
                {booking.booking_type === 'offline' ? (
                  <>
                    {booking.rental_amount && (
                      <p>Rental Amount: ₹{booking.rental_amount.toLocaleString()}</p>
                    )}
                    {booking.security_deposit_amount && (
                      <p>Security Deposit: ₹{booking.security_deposit_amount.toLocaleString()}</p>
                    )}
                    {booking.total_amount && (
                      <p className="font-semibold">Total Amount: ₹{booking.total_amount.toLocaleString()}</p>
                    )}
                    {booking.paid_amount && (
                      <p className="text-green-600">Paid: ₹{booking.paid_amount.toLocaleString()}</p>
                    )}
                    {booking.pending_amount && (
                      <p className="text-red-600">Pending: ₹{booking.pending_amount.toLocaleString()}</p>
                    )}
                    {booking.payment_method && (
                      <p>Payment Method: {booking.payment_method}</p>
                    )}
                    {booking.payment_reference && (
                      <p>Reference: {booking.payment_reference}</p>
                    )}
                  </>
                ) : (
                  <p className="text-lg font-semibold">₹{booking.amount.toLocaleString()}</p>
                )}
              </div>
            </div>

            {booking.vehicle_return && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Vehicle Return Details</h3>
                <p className="mt-1">Return Date: {formatDateTime(booking.vehicle_return.return_date)}</p>
                {booking.vehicle_return.additional_charges > 0 && (
                  <p className="text-red-600">Additional Charges: ₹{booking.vehicle_return.additional_charges.toLocaleString()}</p>
                )}
                {booking.vehicle_return.condition_notes && (
                  <p className="mt-1 text-gray-600">{booking.vehicle_return.condition_notes}</p>
                )}
              </div>
            )}

            {booking.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-500">Notes</h3>
                <p className="mt-1 text-gray-600">{booking.notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Documents Section for Offline Bookings */}
        {booking.booking_type === 'offline' && booking.customer.documents && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Uploaded Documents</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {booking.customer.documents.dl_scan && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Driver's License</h4>
                  <a
                    href={booking.customer.documents.dl_scan}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    View DL Scan
                  </a>
                </div>
              )}
              {booking.customer.documents.aadhar_scan && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Aadhar Card</h4>
                  <a
                    href={booking.customer.documents.aadhar_scan}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    View Aadhar Scan
                  </a>
                </div>
              )}
              {booking.customer.documents.selfie && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2">Customer Photo</h4>
                  <a
                    href={booking.customer.documents.selfie}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    View Selfie
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        <BookingActions 
          bookingId={booking.booking_id} 
          currentStatus={booking.status}
        />
      </div>
    </div>
  );
} 