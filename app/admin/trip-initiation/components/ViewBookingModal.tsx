import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

interface BookingWithRelations {
  id: string;
  booking_id: string;
  user_id: string;
  vehicle_id: string;
  start_date: string;
  end_date: string;
  total_price: number;
  status: 'pending' | 'confirmed' | 'initiated' | 'completed' | 'cancelled';
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
    type?: string;
  };
  user?: {
    id: string;
    name: string;
    phone: string;
    email?: string;
  };
  documents?: {
    dlFront?: string;
    dlBack?: string;
    aadhaarFront?: string;
    aadhaarBack?: string;
    customerPhoto?: string;
    signature?: string;
  };
}

interface TripInitiation {
  id: string;
  booking_id: string;
  checklist_completed: boolean;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  customer_dl_number: string;
  customer_address: string;
  emergency_contact: string;
  emergency_name: string;
  customer_aadhaar_number: string;
  customer_dob: string;
  vehicle_number: string;
  documents: Record<string, string>;
  terms_accepted: boolean;
  notes: string;
  fuel_level?: string;
  odometer_reading?: string;
  damage_notes?: string;
  cleanliness_notes?: string;
  created_at: string;
  updated_at: string;
}

interface ViewBookingModalProps {
  booking: BookingWithRelations;
  isOpen: boolean;
  onClose: () => void;
}

export default function ViewBookingModal({ booking, isOpen, onClose }: ViewBookingModalProps) {
  const [initiationDetails, setInitiationDetails] = useState<TripInitiation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInitiationDetails = async () => {
      if (isOpen && booking.status === 'initiated') {
        try {
          setLoading(true);
          const response = await fetch(`/api/admin/bookings/${booking.id}/initiate`);
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setInitiationDetails(data.initiation);
            }
          }
        } catch (error) {
          console.error('Failed to fetch initiation details:', error);
        } finally {
          setLoading(false);
        }
      } else {
        setInitiationDetails(null);
      }
    };

    fetchInitiationDetails();
  }, [isOpen, booking.id, booking.status]);

  // Helper function to get badge variant based on status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'cancelled':
        return 'destructive';
      case 'confirmed':
        return 'success';
      case 'initiated':
        return 'outline';
      case 'completed':
        return 'success';
      default:
        return 'warning';
    }
  };

  const renderDocument = (label: string, url?: string) => {
    if (!url) return null;
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <div className="relative aspect-video w-full overflow-hidden rounded-md border bg-gray-100">
          <img
            src={url}
            alt={label}
            className="object-contain w-full h-full"
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            Booking Details - {booking.booking_id}
            <Badge variant={booking.booking_type === 'offline' ? 'secondary' : 'default'}>
              {booking.booking_type}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {loading && (
            <div className="flex justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          )}

          {/* Initiation Details Section */}
          {initiationDetails && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="text-lg font-semibold mb-3 text-blue-900">Trip Initiation Details</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-blue-800 border-b border-blue-200 pb-1">Operational Data</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Fuel Level</p>
                        <p className="font-medium">{initiationDetails.fuel_level || 'N/A'}%</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Odometer</p>
                        <p className="font-medium">{initiationDetails.odometer_reading || 'N/A'} km</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-gray-500">Vehicle Number</p>
                        <p className="font-medium">{initiationDetails.vehicle_number || 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-blue-800 border-b border-blue-200 pb-1">Inspection Notes</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <p className="text-gray-500">Damage Assessment</p>
                        <p className="font-medium">{initiationDetails.damage_notes || 'None recorded'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Cleanliness</p>
                        <p className="font-medium">{initiationDetails.cleanliness_notes || 'None recorded'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Trip Notes</p>
                        <p className="font-medium">{initiationDetails.notes || 'None recorded'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Left Column - Basic Info */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{initiationDetails?.customer_name || booking.user?.name || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{initiationDetails?.customer_phone || booking.user?.phone || 'N/A'}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{initiationDetails?.customer_email || booking.user?.email || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Emergency Contact</p>
                    <p className="font-medium">{initiationDetails?.emergency_contact || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Emergency Name</p>
                    <p className="font-medium">{initiationDetails?.emergency_name || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Vehicle Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Vehicle</p>
                    <p className="font-medium">{booking.vehicle?.name || 'N/A'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-medium">{booking.vehicle?.type || 'N/A'}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Booking Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Start Date</p>
                    <p className="font-medium">{formatDateTime(booking.start_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">End Date</p>
                    <p className="font-medium">{formatDateTime(booking.end_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="font-medium">{formatCurrency(booking.total_price)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge variant={getStatusBadgeVariant(booking.status)}>
                      {booking.status}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Payment & Docs */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Payment Status</p>
                    <Badge variant={getStatusBadgeVariant(booking.payment_status)}>
                      {booking.payment_status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-500">Method</p>
                    <p className="font-medium">{booking.payment_method || 'N/A'}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-gray-500">Reference</p>
                    <p className="font-medium">{booking.payment_reference || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Captured Documents */}
              {initiationDetails?.documents && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Captured Documents</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {renderDocument('DL Front', initiationDetails.documents.dlFront)}
                    {renderDocument('DL Back', initiationDetails.documents.dlBack)}
                    {renderDocument('Aadhaar Front', initiationDetails.documents.aadhaarFront)}
                    {renderDocument('Aadhaar Back', initiationDetails.documents.aadhaarBack)}
                    {renderDocument('Customer Photo', initiationDetails.documents.customerPhoto)}
                    {renderDocument('Signature', initiationDetails.documents.signature)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
