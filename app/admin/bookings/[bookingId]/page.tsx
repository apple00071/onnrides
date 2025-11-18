'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { ArrowLeft, Eye } from 'lucide-react';
import { BookingActions } from '@/components/bookings/BookingActions';
import { DocumentViewerModal } from '@/components/ui/DocumentViewerModal';

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
  pickup_location?: string | null;
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
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [selectedDocumentIndex, setSelectedDocumentIndex] = useState(0);
  const router = useRouter();

  const getCleanLocation = (location?: string | null) => {
    if (!location) return 'Not specified';
    return location.replace(/^"|"$/g, '');
  };

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

  // Prepare documents for the modal
  const prepareDocuments = () => {
    if (!booking?.customer.documents) return [];

    const documents = [];

    if (booking.customer.documents.dl_scan) {
      documents.push({
        id: 'dl_scan',
        title: "Driver's License",
        url: booking.customer.documents.dl_scan,
        type: booking.customer.documents.dl_scan.toLowerCase().includes('.pdf') ? 'pdf' as const : 'image' as const
      });
    }

    if (booking.customer.documents.aadhar_scan) {
      documents.push({
        id: 'aadhar_scan',
        title: 'Aadhar Card',
        url: booking.customer.documents.aadhar_scan,
        type: booking.customer.documents.aadhar_scan.toLowerCase().includes('.pdf') ? 'pdf' as const : 'image' as const
      });
    }

    if (booking.customer.documents.selfie) {
      documents.push({
        id: 'selfie',
        title: 'Customer Photo',
        url: booking.customer.documents.selfie,
        type: 'image' as const
      });
    }

    return documents;
  };

  // Handle opening document modal
  const openDocumentModal = (documentType: string) => {
    const documents = prepareDocuments();
    const index = documents.findIndex(doc => doc.id === documentType);
    if (index !== -1) {
      setSelectedDocumentIndex(index);
      setIsDocumentModalOpen(true);
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
              {booking.booking_type === 'online' && booking.payment_status === 'completed' && booking.status !== 'cancelled' && booking.status !== 'completed' ? 
                'Payment: 5% Collected' : 
                `Payment: ${booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}`
              }
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
              <h3 className="text-sm font-medium text-gray-500">Location</h3>
              <p className="mt-1 text-gray-600">
                {getCleanLocation(booking.pickup_location)}
              </p>
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
                    
                    {/* Add payment collection for offline bookings with pending amounts - only for active bookings */}
                    {booking.pending_amount && booking.pending_amount > 0 && booking.status !== 'cancelled' && booking.status !== 'completed' && (
                      <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="text-sm font-medium text-orange-800 mb-2">Collect Pending Payment</p>
                        <p className="text-lg font-bold text-orange-600 mb-2">
                          Pending: ₹{booking.pending_amount.toLocaleString()}
                        </p>
                        <button
                          onClick={async () => {
                            const confirmed = confirm(`Collect pending payment of ₹${booking.pending_amount?.toLocaleString() || '0'}?`);
                            if (confirmed) {
                              try {
                                const response = await fetch(`/api/admin/bookings/${booking.booking_id}/collect-payment`, {
                                  method: 'POST',
                                  headers: {
                                    'Content-Type': 'application/json',
                                  },
                                  body: JSON.stringify({
                                    payment_method: 'cash',
                                    amount: parseFloat(booking.pending_amount?.toString() || '0')
                                  }),
                                });

                                const result = await response.json();

                                if (result.success) {
                                  alert(`Payment collected successfully! New status: ${result.data.payment_status}`);
                                  // Refresh the page to show updated data
                                  window.location.reload();
                                } else {
                                  alert(`Error: ${result.error}`);
                                }
                              } catch (error) {
                                console.error('Payment collection error:', error);
                                alert('Failed to collect payment. Please try again.');
                              }
                            }
                          }}
                          className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-0"
                        >
                          <span>Collect Payment</span>
                        </button>
                        <p className="text-xs text-orange-700 mt-2">
                          Click to mark the pending amount as collected
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold">Total Booking Amount: ₹{booking.amount.toLocaleString()}</p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                      <p className="text-sm font-medium text-blue-800">Online Booking - 5% Collection Policy</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Collected Online: ₹{Math.round(booking.amount * 0.05).toLocaleString()} (5%)
                      </p>
                      <p className="text-sm text-blue-700">
                        Remaining Amount: ₹{Math.round(booking.amount * 0.95).toLocaleString()} (95% - To be collected at pickup)
                      </p>
                    </div>
                    <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm font-medium text-orange-800 mb-2">Payment Collection</p>
                      <button
                        onClick={() => window.open(`/admin/vehicle-returns/new?bookingId=${booking.booking_id}`, '_blank')}
                        className="inline-flex items-center px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-0"
                      >
                        <span>Collect Remaining Payment</span>
                      </button>
                      <p className="text-xs text-orange-700 mt-2">
                        Use this to collect the remaining 95% payment when customer picks up the vehicle
                      </p>
                    </div>
                    {booking.payment_method && (
                      <p className="mt-2">Payment Method: {booking.payment_method}</p>
                    )}
                    {booking.payment_reference && (
                      <p>Reference: {booking.payment_reference}</p>
                    )}
                  </>
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
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-medium text-gray-700 mb-3">Driver's License</h4>
                  <button
                    onClick={() => openDocumentModal('dl_scan')}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View DL Scan</span>
                  </button>
                </div>
              )}
              {booking.customer.documents.aadhar_scan && (
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-medium text-gray-700 mb-3">Aadhar Card</h4>
                  <button
                    onClick={() => openDocumentModal('aadhar_scan')}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Aadhar Scan</span>
                  </button>
                </div>
              )}
              {booking.customer.documents.selfie && (
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h4 className="font-medium text-gray-700 mb-3">Customer Photo</h4>
                  <button
                    onClick={() => openDocumentModal('selfie')}
                    className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View Selfie</span>
                  </button>
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

      {/* Document Viewer Modal */}
      <DocumentViewerModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        documents={prepareDocuments()}
        initialDocumentIndex={selectedDocumentIndex}
      />
    </div>
  );
}