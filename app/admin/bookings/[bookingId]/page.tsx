'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { toast } from 'sonner';
import { ArrowLeft, Eye, Pencil, PlayCircle, CheckCircle, Car, FileText, UserCircle, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BookingActions } from '@/components/bookings/BookingActions';
import { DocumentViewerModal } from '@/components/ui/DocumentViewerModal';
import { Badge } from '@/components/ui/badge';
import { getBadgeColor } from '@/lib/constants/status-colors';
import { EditBookingModal } from '@/components/bookings/EditBookingModal';
import { InitiateTripModal } from '@/components/bookings/InitiateTripModal';

interface BookingDetails {
  id: string;
  booking_id: string;
  created_at: string;
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
  trip_initiation?: {
    checklist_details?: Record<string, boolean>;
    fuel_level?: string;
    odometer_reading?: string;
    damage_notes?: string;
    cleanliness_notes?: string;
    documents?: Record<string, string>;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    dl_number?: string;
    aadhaar_number?: string;
  } | null;
}

export default function BookingDetailsPage({ params }: { params: { bookingId: string } }) {
  const [booking, setBooking] = useState<BookingDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);
  const [selectedDocumentIndex, setSelectedDocumentIndex] = useState(0);
  const router = useRouter();

  const getCleanLocation = (location?: string | null) => {
    if (!location) return 'Not specified';
    return location.replace(/^"|"$/g, '');
  };

  useEffect(() => {
    fetchBookingDetails();
  }, [params.bookingId]);

  const fetchBookingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/admin/bookings/${params.bookingId}`);
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

  // Helper to get fuel color
  const getFuelColor = (level: number) => {
    if (level > 75) return 'bg-green-500';
    if (level > 50) return 'bg-lime-500';
    if (level > 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Prepare documents for the modal
  const prepareDocuments = () => {
    const documents = [];

    // Customer Documents (from booking.customer.documents)
    if (booking?.customer.documents) {
      if (booking.customer.documents.dl_scan) {
        documents.push({
          id: 'dl_scan',
          title: "Driver's License (Booking)",
          url: booking.customer.documents.dl_scan,
          type: booking.customer.documents.dl_scan.toLowerCase().includes('.pdf') ? 'pdf' as const : 'image' as const
        });
      }
      if (booking.customer.documents.aadhar_scan) {
        documents.push({
          id: 'aadhar_scan',
          title: 'Aadhar Card (Booking)',
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
    }

    // Trip Initiation Documents
    if (booking?.trip_initiation?.documents) {
      Object.entries(booking.trip_initiation.documents).forEach(([key, url]) => {
        if (key !== 'signature' && url) {
          documents.push({
            id: `trip_${key}`,
            title: key.replace(/([A-Z])/g, ' $1').trim(),
            url: url as string,
            type: (url as string).toLowerCase().includes('.pdf') ? 'pdf' as const : 'image' as const
          });
        }
      });
    }

    return documents;
  };

  // Handle payment collection
  const handleCollectPayment = async (amount: number) => {
    if (!amount || amount <= 0) return;

    const confirmed = confirm(`Collect payment of ₹${amount.toLocaleString()}?`);
    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/bookings/${booking?.booking_id}/collect-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_method: 'cash',
          amount: amount
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Payment of ₹${amount.toLocaleString()} collected successfully!`);
        window.location.reload();
      } else {
        toast.error(`Error: ${result.error}`);
        setLoading(false);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to collect payment');
      setLoading(false);
    }
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
            <div className="flex flex-col">
              <p className="text-gray-600">Booking ID: {booking.booking_id}</p>
              <p className="text-sm text-gray-500">
                Booked on: {formatDateTime(booking.created_at)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge className={getBadgeColor(booking.status)}>
              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
            </Badge>
            <Badge variant="secondary" className={getBadgeColor(booking.payment_status)}>
              {booking.booking_type === 'online' && booking.payment_status === 'completed' && booking.status !== 'cancelled' && booking.status !== 'completed' ?
                'Payment: 5% Collected' :
                `Payment: ${booking.payment_status.charAt(0).toUpperCase() + booking.payment_status.slice(1)}`
              }
            </Badge>
          </div>
          <div className="flex flex-col md:flex-row gap-2 mt-2 md:mt-0">
            {/* Initiate Trip Button - Only for confirmed bookings */}
            {booking.status === 'confirmed' && (
              <button
                onClick={() => setIsInitiateModalOpen(true)}
                className="flex items-center gap-1 text-sm text-[#f26e24] hover:text-[#d95e1d] font-medium"
              >
                <PlayCircle size={14} /> Initiate Trip
              </button>
            )}
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1 text-sm text-[#f26e24] hover:text-[#d95e1d] font-medium"
            >
              <Pencil size={14} /> Edit Booking
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Col 1: Entities (Vehicle & Customer) */}
          <div className="space-y-4">
            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <Car className="h-4 w-4" /> Vehicle
              </h3>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-bold text-gray-900">{booking.vehicle.name}</p>
                  <Badge variant="outline" className="mt-1 capitalize">{booking.vehicle.type}</Badge>
                </div>
                <div className="text-right text-sm text-gray-500">
                  {booking.vehicle.model && <p>{booking.vehicle.model}</p>}
                  {booking.vehicle.registration_number && <p className="font-mono">{booking.vehicle.registration_number}</p>}
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-lg p-4 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
                <UserCircle className="h-4 w-4" /> Customer
              </h3>
              <div className="space-y-2">
                <div>
                  <p className="font-semibold text-gray-900">{booking.customer.name}</p>
                  <p className="text-sm text-gray-500">{booking.customer.email}</p>
                </div>
                <div className="flex flex-col gap-1 text-sm bg-gray-50 p-2 rounded">
                  <p className="flex items-center gap-2 text-gray-700">
                    <span className="text-xs text-gray-400">Phone</span> {booking.customer.phone}
                  </p>
                  {booking.customer.alternate_phone && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <span className="text-xs text-gray-400">Alt</span> {booking.customer.alternate_phone}
                    </p>
                  )}
                </div>

                {booking.booking_type === 'offline' && (
                  <div className="mt-3 pt-3 border-t text-xs text-gray-500 space-y-1">
                    {booking.customer.dl_number && <p>DL: {booking.customer.dl_number}</p>}
                    {booking.customer.aadhar_number && <p>Aadhar: {booking.customer.aadhar_number}</p>}
                    {booking.customer.permanent_address && <p className="truncate">Addr: {booking.customer.permanent_address}</p>}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Col 2: Trip Details */}
          <div className="space-y-4">
            <div className="bg-white border rounded-lg p-4 shadow-sm h-full">
              <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                <PlayCircle className="h-4 w-4" /> Trip Schedule
              </h3>

              <div className="relative pl-4 border-l-2 border-orange-100 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-orange-500 border-2 border-white ring-1 ring-orange-100"></div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Pickup</p>
                  <p className="font-medium text-gray-900">{formatDateTime(booking.duration.from)}</p>
                  <p className="text-sm text-gray-600 mt-1">{getCleanLocation(booking.pickup_location)}</p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-gray-300 border-2 border-white ring-1 ring-gray-100"></div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Dropoff</p>
                  <p className="font-medium text-gray-900">{formatDateTime(booking.duration.to)}</p>
                  {booking.vehicle_return ? (
                    <div className="mt-2 text-xs bg-green-50 text-green-700 p-2 rounded">
                      Returned on {formatDateTime(booking.vehicle_return.return_date)}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 mt-1 italic">Same location</p>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Booking Type</span>
                  <Badge variant="secondary" className="capitalize">{booking.booking_type}</Badge>
                </div>
                {booking.notes && (
                  <div className="mt-3 bg-yellow-50 p-3 rounded text-sm text-yellow-800 border border-yellow-100">
                    <p className="font-medium text-xs uppercase mb-1 text-yellow-600">Notes</p>
                    {booking.notes}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Col 3: Payment Details */}
          <div className="space-y-4">
            <div className="bg-white border rounded-lg p-4 shadow-sm h-full flex flex-col">
              <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Payment Summary
              </h3>

              <div className="flex-1 space-y-4">
                {/* Price Header */}
                <div className="flex items-baseline justify-between border-b pb-4">
                  <span className="text-gray-600">Total Amount</span>
                  <span className="text-2xl font-bold text-gray-900">₹{booking.amount?.toLocaleString() || booking.total_amount?.toLocaleString()}</span>
                </div>

                {/* Payment Logic Block */}
                {booking.booking_type === 'offline' ? (
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Rental</span>
                      <span>₹{booking.rental_amount?.toLocaleString() || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Security Deposit</span>
                      <span>₹{booking.security_deposit_amount?.toLocaleString() || '-'}</span>
                    </div>

                    <div className="pt-2 border-t mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-gray-500">Paid Amount</span>
                        <span className="font-medium text-green-600">₹{booking.paid_amount?.toLocaleString() || '0'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-500">Pending</span>
                        <span className="font-medium text-red-600">₹{booking.pending_amount?.toLocaleString() || '0'}</span>
                      </div>
                    </div>

                    {/* Collection Action */}
                    {booking.pending_amount && booking.pending_amount > 0 && booking.status !== 'cancelled' && booking.status !== 'completed' && (
                      <div className="mt-4 p-3 bg-orange-50 rounded-md border border-orange-100">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium text-orange-800">Pending Collection</span>
                          <span className="font-bold text-orange-700">₹{booking.pending_amount.toLocaleString()}</span>
                        </div>
                        <Button
                          onClick={() => handleCollectPayment(parseFloat(booking.pending_amount?.toString() || '0'))}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                          size="sm"
                        >
                          Collect Payment
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Online Booking Logic */}
                    {/* Dynamic Payment Summary */}
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-md text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="text-blue-700">Total Amount</span>
                        <span className="font-bold text-blue-900">₹{booking.amount?.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between mb-1">
                        <span className="text-blue-700">Paid {booking.booking_type === 'online' ? '(Online)' : ''}</span>
                        <span className="font-bold text-green-700">₹{booking.paid_amount?.toLocaleString() || '0'}</span>
                      </div>
                      {booking.pending_amount && booking.pending_amount > 0 && (
                        <div className="flex justify-between border-t border-blue-200 pt-1 mt-1">
                          <span className="text-orange-700 font-medium">Pending</span>
                          <span className="font-bold text-orange-700">₹{booking.pending_amount.toLocaleString()}</span>
                        </div>
                      )}
                    </div>

                    {/* Collection Action */}
                    {booking.pending_amount && booking.pending_amount > 0 ? (
                      <div className="p-3 bg-orange-50 border border-orange-100 rounded-md">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium text-orange-800">Remaining Payment</span>
                        </div>
                        <Button
                          onClick={() => handleCollectPayment(booking.pending_amount || Math.round(booking.amount * 0.95))}
                          className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                          size="sm"
                        >
                          Collect Remaining
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 bg-green-50 border border-green-100 rounded-md text-center">
                        <p className="text-sm font-medium text-green-800 flex items-center justify-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Payment Completed
                        </p>
                      </div>
                    )}

                    {booking.payment_reference && (
                      <p className="text-xs text-gray-400 pt-2 border-t mt-2">Ref: {booking.payment_reference}</p>
                    )}
                  </div>
                )}

                {/* Return Info if exists */}
                {booking.vehicle_return && booking.vehicle_return.additional_charges > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex justify-between text-red-600 font-medium text-sm">
                      <span>Addt. Charges</span>
                      <span>₹{booking.vehicle_return.additional_charges.toLocaleString()}</span>
                    </div>
                    {booking.vehicle_return.condition_notes && (
                      <p className="text-xs text-gray-500 mt-1">{booking.vehicle_return.condition_notes}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
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

        {/* Trip Initiation Details Section */}
        {booking.trip_initiation && (
          <div className="mt-6 border-t pt-4">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-orange-600" />
              Trip Initiation Details
            </h2>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Fuel Level</p>
                <p className={`font-bold text-2xl ${getFuelColor(parseInt(booking.trip_initiation.fuel_level || '0')).replace('bg-', 'text-')}`}>
                  {booking.trip_initiation.fuel_level}%
                </p>
              </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm">
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Odometer</p>
                <p className="font-bold text-2xl text-gray-900">{booking.trip_initiation.odometer_reading} <span className="text-sm font-normal text-gray-500">km</span></p>
              </div>

              <div className="bg-white p-4 rounded-lg border shadow-sm relative group cursor-pointer hover:border-blue-300 transition-colors"
                onClick={() => booking.trip_initiation?.documents?.signature && window.open(booking.trip_initiation.documents.signature, '_blank')}>
                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Signature</p>
                {booking.trip_initiation.documents?.signature ? (
                  <div className="flex items-center gap-2 text-blue-600 font-medium h-8">
                    <Edit3 className="h-5 w-5" />
                    <span>View Signature</span>
                  </div>
                ) : (
                  <span className="text-xs text-gray-400 italic h-8 flex items-center">Not recorded</span>
                )}
              </div>
            </div>

            {/* Dynamic Layout Content */}
            {(() => {
              const hasChecklist = booking.trip_initiation.checklist_details && Object.keys(booking.trip_initiation.checklist_details).length > 0;
              const hasDocuments = booking.trip_initiation.documents && Object.keys(booking.trip_initiation.documents).length > 0;

              return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Customer & Notes */}
                  <div className="space-y-6">
                    {/* Verified Customer Card */}
                    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
                      <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                          <UserCircle className="h-4 w-4 text-gray-500" />
                          Verified Customer
                        </h3>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-xs text-gray-500">Name</p>
                          <p className="font-medium text-gray-900">{booking.trip_initiation.customer_name}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Phone</p>
                          <p className="font-medium text-gray-900">{booking.trip_initiation.customer_phone}</p>
                        </div>
                        {booking.trip_initiation.dl_number && (
                          <div>
                            <p className="text-xs text-gray-500">DL Number</p>
                            <p className="font-medium text-gray-900 font-mono">{booking.trip_initiation.dl_number}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {(booking.trip_initiation.damage_notes || booking.trip_initiation.cleanliness_notes) && (
                      <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
                        <h3 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2 text-sm">
                          <Edit3 className="h-4 w-4" />
                          Trip Notes
                        </h3>
                        <div className="space-y-2 text-sm text-yellow-800">
                          {booking.trip_initiation.damage_notes && (
                            <p><strong>Damage:</strong> {booking.trip_initiation.damage_notes}</p>
                          )}
                          {booking.trip_initiation.cleanliness_notes && (
                            <p><strong>Cleanliness:</strong> {booking.trip_initiation.cleanliness_notes}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Content varies based on Checklist existence */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Scenario A: HAS Checklist -> Show Checklist here */}
                    {hasChecklist ? (
                      <div className="bg-white rounded-lg border shadow-sm overflow-hidden h-full">
                        <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                          <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 text-gray-500" />
                            Trip Checklist
                          </h3>
                          <Badge variant="outline" className="bg-white">
                            {Object.keys(booking.trip_initiation.checklist_details!).length} Items
                          </Badge>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                            {Object.entries(booking.trip_initiation.checklist_details!).map(([key, value]) => (
                              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0 group hover:bg-gray-50 px-2 rounded-md transition-colors">
                                <span className="text-sm text-gray-700 capitalize group-hover:text-gray-900">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                {value ? (
                                  <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                                    <CheckCircle className="h-3.5 w-3.5" />
                                    <span className="text-xs font-medium">Pass</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                                    <span className="text-xs font-medium">Fail</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Scenario B: NO Checklist -> Documents take the main stage */
                      hasDocuments && (
                        <div className="bg-white rounded-lg border shadow-sm overflow-hidden h-full">
                          <div className="bg-gray-50 px-4 py-3 border-b">
                            <h3 className="font-semibold text-gray-900 flex items-center gap-2 text-sm">
                              <FileText className="h-4 w-4 text-gray-500" />
                              Trip Documents
                            </h3>
                          </div>
                          <div className="p-4">
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                              {Object.entries(booking.trip_initiation!.documents!)
                                .filter(([key]) => key !== 'signature')
                                .map(([key, url]) => (
                                  <div
                                    key={key}
                                    className="group relative aspect-square bg-gray-100 rounded-md overflow-hidden cursor-pointer border hover:border-orange-300 transition-all shadow-sm hover:shadow-md"
                                    onClick={() => openDocumentModal(`trip_${key}`)}
                                  >
                                    <img
                                      src={url as string}
                                      alt={key}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent py-2 px-1">
                                      <p className="text-[10px] text-white text-center truncate capitalize font-medium">
                                        {key.replace(/([A-Z])/g, ' ').trim()}
                                      </p>
                                    </div>
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                      <div className="bg-white/90 p-1.5 rounded-full shadow-lg transform scale-0 group-hover:scale-100 transition-transform duration-200">
                                        <Eye className="text-gray-700 h-4 w-4" />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  {/* Bottom Row: Documents (Only if Checklist existed, so they didn't fit in the right column) */}
                  {hasChecklist && hasDocuments && (
                    <div className="lg:col-span-3">
                      <div className="bg-white rounded-lg border shadow-sm overflow-hidden p-4">
                        <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-gray-500" />
                          Uploaded Documents
                        </h3>
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                          {Object.entries(booking.trip_initiation!.documents!)
                            .filter(([key]) => key !== 'signature')
                            .map(([key, url]) => (
                              <div key={key}
                                className="shrink-0 w-32 group relative border rounded-md overflow-hidden bg-gray-50 cursor-pointer hover:ring-2 hover:ring-orange-200 transition-all"
                                onClick={() => openDocumentModal(`trip_${key}`)}
                              >
                                <div className="aspect-square relative">
                                  <img
                                    src={url as string}
                                    alt={key}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                                    <Eye className="text-white opacity-0 group-hover:opacity-100 h-6 w-6 drop-shadow-md" />
                                  </div>
                                </div>
                                <div className="py-1 px-1 bg-white text-center border-t">
                                  <p className="text-[10px] font-medium text-gray-700 capitalize truncate">
                                    {key.replace(/([A-Z])/g, ' ').trim()}
                                  </p>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

      </div>

      <DocumentViewerModal
        isOpen={isDocumentModalOpen}
        onClose={() => setIsDocumentModalOpen(false)}
        documents={prepareDocuments()}
        initialDocumentIndex={selectedDocumentIndex}
      />

      {booking && (
        <>
          <EditBookingModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            booking={{
              id: booking.id,
              booking_id: booking.booking_id,
              start_date: booking.duration.from,
              end_date: booking.duration.to,
              pickup_location: booking.pickup_location,
              total_amount: booking.total_amount || booking.amount,
              status: booking.status,
              vehicle_id: booking.vehicle.name
            }}
            onUpdate={fetchBookingDetails}
          />

          <InitiateTripModal
            isOpen={isInitiateModalOpen}
            onClose={() => setIsInitiateModalOpen(false)}
            booking={{
              ...booking,
              user_id: booking.customer.id,
              vehicle_id: booking.vehicle.name,
              start_date: booking.duration.from,
              end_date: booking.duration.to,
              total_price: booking.total_amount || booking.amount || 0,
              total_amount: booking.total_amount || booking.amount || 0,
              status: booking.status,
              payment_status: booking.payment_status,
              payment_method: booking.payment_method,
              payment_reference: booking.payment_reference,
              notes: booking.notes,
              booking_type: booking.booking_type,
              vehicle: {
                id: booking.vehicle.name,
                name: booking.vehicle.name
              },
              user: {
                id: booking.customer.id,
                name: booking.customer.name,
                phone: booking.customer.phone,
                email: booking.customer.email
              },
              documents: {
                dlFront: booking.customer.documents?.dl_scan,
                aadhaarFront: booking.customer.documents?.aadhar_scan,
                customerPhoto: booking.customer.documents?.selfie
              }
            }}
            onInitiateSuccess={fetchBookingDetails}
          />
        </>
      )}
    </div>
  );
}