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
    <div className="p-4 md:p-6 max-w-full">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-primary hover:text-primary/80 flex items-center gap-2 p-0 h-auto font-bold text-sm tracking-tight"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Bookings</span>
        </Button>
      </div>

      <div className="bg-white rounded-xl border shadow-sm p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 pb-6 border-b">
          <div className="space-y-1">
            <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">Booking Details</h1>
            <div className="flex flex-col text-sm text-gray-500">
              <span className="font-bold text-primary">ID: {booking.booking_id}</span>
              <span>Booked on: {formatDateTime(booking.created_at)}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge className={`${getBadgeColor(booking.status)} shadow-sm font-black text-[10px] uppercase tracking-wider px-2.5 py-1 box-border h-fit`}>
              {booking.status}
            </Badge>
            <Badge variant="outline" className={`${getBadgeColor(booking.payment_status)} font-black text-[10px] uppercase tracking-wider px-2.5 py-1 box-border h-fit`}>
              {booking.booking_type === 'online' && booking.payment_status === 'completed' && booking.status !== 'cancelled' && booking.status !== 'completed' ?
                '5% Collected' :
                `Payment: ${booking.payment_status}`
              }
            </Badge>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
            {booking.status === 'confirmed' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsInitiateModalOpen(true)}
                className="flex items-center justify-center gap-2 text-xs font-bold border-orange-200 text-orange-600 hover:bg-orange-50 h-9 rounded-lg px-4"
              >
                <PlayCircle className="h-4 w-4" />
                <span>Initiate Trip</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center justify-center gap-2 text-xs font-bold border-gray-200 text-gray-600 hover:bg-gray-50 h-9 rounded-lg px-4"
            >
              <Pencil className="h-4 w-4" />
              <span>Edit Booking</span>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Col 1: Entities (Vehicle & Customer) */}
          <div className="space-y-4">
            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <Car className="h-4 w-4" /> Vehicle
              </h3>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-lg font-black text-gray-900 tracking-tight">{booking.vehicle.name}</p>
                  <Badge variant="outline" className={`${getBadgeColor(booking.vehicle.type)} mt-1 capitalize font-bold text-[10px]`}>{booking.vehicle.type}</Badge>
                </div>
                <div className="text-right text-xs">
                  {booking.vehicle.model && <p className="font-bold text-gray-700">{booking.vehicle.model}</p>}
                  {booking.vehicle.registration_number && (
                    <span className="text-[10px] font-mono tracking-wider text-primary bg-primary/5 px-1.5 py-0.5 rounded mt-1 block w-fit ml-auto uppercase border border-primary/10">
                      {booking.vehicle.registration_number}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border rounded-xl p-4 shadow-sm">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                <UserCircle className="h-4 w-4" /> Customer
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="font-black text-gray-900 tracking-tight">{booking.customer.name}</p>
                  <p className="text-xs font-medium text-gray-500">{booking.customer.email}</p>
                </div>
                <div className="flex flex-col gap-1.5 text-sm bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                  <p className="flex items-center gap-2 text-gray-700">
                    <span className="text-[10px] font-black text-gray-400 uppercase w-10">Phone</span>
                    <span className="font-bold tabular-nums text-primary">{booking.customer.phone}</span>
                  </p>
                  {booking.customer.alternate_phone && (
                    <p className="flex items-center gap-2 text-gray-700">
                      <span className="text-[10px] font-black text-gray-400 uppercase w-10">Alt</span>
                      <span className="font-bold tabular-nums text-gray-600">{booking.customer.alternate_phone}</span>
                    </p>
                  )}
                </div>

                {booking.booking_type === 'offline' && (
                  <div className="mt-3 pt-3 border-t text-[11px] text-gray-500 space-y-1.5">
                    <div className="flex justify-between">
                      <span className="font-bold uppercase text-[9px] text-gray-400">DL Number</span>
                      <span className="font-mono text-gray-700">{booking.customer.dl_number || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-bold uppercase text-[9px] text-gray-400">Aadhar</span>
                      <span className="font-mono text-gray-700">{booking.customer.aadhar_number || 'N/A'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Col 2: Trip Details */}
          <div className="space-y-4">
            <div className="bg-white border rounded-xl p-4 shadow-sm h-full flex flex-col">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <PlayCircle className="h-4 w-4" /> Trip Schedule
              </h3>

              <div className="relative pl-6 border-l-2 border-orange-100 space-y-8 flex-1">
                <div className="relative">
                  <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-green-500 border-2 border-white shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1.5 leading-none">Pickup</p>
                  <p className="font-black text-gray-900 leading-tight">{formatDateTime(booking.duration.from)}</p>
                  <p className="text-xs font-bold text-gray-500 mt-1.5 flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-300 font-normal uppercase">Loc:</span> {getCleanLocation(booking.pickup_location)}
                  </p>
                </div>

                <div className="relative">
                  <div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-orange-500 border-2 border-white shadow-[0_0_8px_rgba(249,115,22,0.4)]"></div>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1.5 leading-none">Dropoff</p>
                  <p className="font-black text-gray-900 leading-tight">{formatDateTime(booking.duration.to)}</p>
                  {booking.vehicle_return ? (
                    <div className="mt-2.5 text-[10px] font-black uppercase bg-green-50 text-green-700 p-2 rounded-lg border border-green-100 w-fit">
                      Returned on {formatDateTime(booking.vehicle_return.return_date)}
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-gray-400 mt-1.5 italic">Same location</p>
                  )}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Booking Type</span>
                  <Badge className={`${getBadgeColor(booking.booking_type)} font-black text-[10px] uppercase px-2`}>{booking.booking_type}</Badge>
                </div>
                {booking.notes && (
                  <div className="mt-4 bg-yellow-50/50 p-3 rounded-lg text-xs text-yellow-800 border border-yellow-100">
                    <p className="font-black text-[9px] uppercase mb-1.5 text-yellow-600 tracking-widest">Admin Notes</p>
                    <p className="leading-relaxed font-medium">{booking.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Col 3: Payment Details */}
          <div className="space-y-4">
            <div className="bg-white border rounded-xl p-4 shadow-sm h-full flex flex-col">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <FileText className="h-4 w-4" /> Payment Summary
              </h3>

              <div className="flex-1 space-y-5">
                {/* Price Header */}
                <div className="flex items-baseline justify-between border-b border-gray-100 pb-5">
                  <span className="text-[11px] font-black text-gray-400 uppercase tracking-wider">Total Amount</span>
                  <span className="text-3xl font-black text-gray-900 tracking-tighter tabular-nums">₹{(booking.amount || booking.total_amount)?.toLocaleString()}</span>
                </div>

                {/* Processing individual blocks */}
                <div className="space-y-4">
                  {booking.booking_type === 'offline' ? (
                    <div className="space-y-3.5 text-xs">
                      <div className="flex justify-between items-center text-gray-600">
                        <span className="font-bold">Rental Amount</span>
                        <span className="font-black tabular-nums">₹{booking.rental_amount?.toLocaleString() || '-'}</span>
                      </div>
                      <div className="flex justify-between items-center text-gray-600">
                        <span className="font-bold">Security Deposit</span>
                        <span className="font-black tabular-nums">₹{booking.security_deposit_amount?.toLocaleString() || '-'}</span>
                      </div>

                      <div className="pt-3 border-t border-gray-50 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-gray-400 uppercase">Paid Amount</span>
                          <span className="font-black text-green-600 tabular-nums">₹{booking.paid_amount?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-gray-400 uppercase">Pending</span>
                          <span className="font-black text-red-600 tabular-nums">₹{booking.pending_amount?.toLocaleString() || '0'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl space-y-3">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-black text-gray-400 uppercase">Paid (Online)</span>
                          <span className="font-black text-green-700 tabular-nums">₹{booking.paid_amount?.toLocaleString() || '0'}</span>
                        </div>
                        {booking.pending_amount && booking.pending_amount > 0 && (
                          <div className="flex justify-between items-center border-t border-gray-200/50 pt-2.5">
                            <span className="text-[11px] font-black text-orange-400 uppercase">Balance Due</span>
                            <span className="font-black text-orange-700 tabular-nums text-lg">₹{booking.pending_amount.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Collection Action */}
                  {booking.pending_amount && booking.pending_amount > 0 && booking.status !== 'cancelled' && booking.status !== 'completed' && (
                    <div className="mt-4 p-4 bg-[#f26e24]/5 rounded-xl border border-[#f26e24]/10">
                      <Button
                        onClick={() => handleCollectPayment(parseFloat(booking.pending_amount?.toString() || '0'))}
                        className="w-full bg-[#f26e24] hover:bg-[#d95e1d] text-white font-black text-xs uppercase tracking-widest h-11 rounded-xl shadow-lg shadow-[#f26e24]/20"
                      >
                        Collect Payment
                      </Button>
                    </div>
                  )}

                  {!booking.pending_amount || booking.pending_amount <= 0 && booking.status === 'completed' && (
                    <div className="p-4 bg-green-50 border border-green-100 rounded-xl text-center">
                      <p className="text-xs font-black text-green-800 flex items-center justify-center gap-2 uppercase tracking-widest">
                        <CheckCircle className="h-4 w-4" />
                        Fully Paid
                      </p>
                    </div>
                  )}
                </div>

                {booking.payment_reference && (
                  <div className="pt-4 border-t border-gray-50">
                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Payment Reference</p>
                    <p className="text-xs font-mono text-gray-500 break-all">{booking.payment_reference}</p>
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
          <div className="mt-8 border-t pt-8">
            <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3 tracking-tight">
              <PlayCircle className="h-6 w-6 text-primary" />
              Trip Initiation Details
            </h2>

            {/* Key Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="bg-white p-5 rounded-xl border shadow-sm border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 leading-none">Fuel Level</p>
                <p className={`font-black text-3xl tabular-nums ${getFuelColor(parseInt(booking.trip_initiation.fuel_level || '0')).replace('bg-', 'text-')}`}>
                  {booking.trip_initiation.fuel_level}%
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border shadow-sm border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 leading-none">Odometer</p>
                <div className="flex items-baseline gap-1.5">
                  <p className="font-black text-3xl text-gray-900 tabular-nums">{booking.trip_initiation.odometer_reading}</p>
                  <span className="text-xs font-bold text-gray-400 uppercase">km</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border shadow-sm border-gray-100 relative group cursor-pointer hover:border-primary/30 transition-all active:scale-[0.98]"
                onClick={() => booking.trip_initiation?.documents?.signature && window.open(booking.trip_initiation.documents.signature, '_blank')}>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 leading-none">Signature</p>
                {booking.trip_initiation.documents?.signature ? (
                  <div className="flex items-center gap-2 text-primary font-black text-xs uppercase h-8">
                    <Edit3 className="h-5 w-5" />
                    <span>View Signature</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-bold text-gray-300 italic h-8 flex items-center uppercase">Not recorded</span>
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
                    <div className="bg-white rounded-xl border shadow-sm overflow-hidden border-gray-100">
                      <div className="bg-gray-50/50 px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="font-black text-gray-900 flex items-center gap-2 text-[10px] uppercase tracking-widest">
                          <UserCircle className="h-4 w-4 text-gray-400" />
                          Verified Identity
                        </h3>
                      </div>
                      <div className="p-4 space-y-4">
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Name</p>
                          <p className="font-black text-gray-900 text-sm tracking-tight">{booking.trip_initiation.customer_name}</p>
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone</p>
                          <p className="font-bold text-primary tabular-nums text-sm">{booking.trip_initiation.customer_phone}</p>
                        </div>
                        {booking.trip_initiation.dl_number && (
                          <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">DL Number</p>
                            <p className="font-bold text-gray-700 font-mono text-sm">{booking.trip_initiation.dl_number}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    {(booking.trip_initiation.damage_notes || booking.trip_initiation.cleanliness_notes) && (
                      <div className="bg-yellow-50/50 rounded-xl border border-yellow-200/50 p-4">
                        <h3 className="font-black text-yellow-900 mb-3 flex items-center gap-2 text-[10px] uppercase tracking-widest">
                          <Edit3 className="h-4 w-4 text-yellow-500" />
                          Condition Notes
                        </h3>
                        <div className="space-y-3 text-xs text-yellow-800">
                          {booking.trip_initiation.damage_notes && (
                            <div className="space-y-1">
                              <span className="font-black text-[9px] uppercase tracking-widest text-yellow-600 block">Damage</span>
                              <p className="font-medium leading-relaxed">{booking.trip_initiation.damage_notes}</p>
                            </div>
                          )}
                          {booking.trip_initiation.cleanliness_notes && (
                            <div className="space-y-1">
                              <span className="font-black text-[9px] uppercase tracking-widest text-yellow-600 block">Cleanliness</span>
                              <p className="font-medium leading-relaxed">{booking.trip_initiation.cleanliness_notes}</p>
                            </div>
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