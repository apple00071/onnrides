import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils/time-formatter';
import { formatCurrency } from '@/lib/utils/currency-formatter';

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

interface ViewBookingModalProps {
  booking: BookingWithRelations;
  isOpen: boolean;
  onClose: () => void;
}

export default function ViewBookingModal({ booking, isOpen, onClose }: ViewBookingModalProps) {
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            Booking Details - {booking.booking_id}
            <Badge variant={booking.booking_type === 'offline' ? 'secondary' : 'default'}>
              {booking.booking_type}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Customer Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Customer Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{booking.user?.name || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{booking.user?.phone || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{booking.user?.email || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Vehicle Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Booking Details */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Booking Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Payment Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Payment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Payment Status</p>
                <Badge variant={getStatusBadgeVariant(booking.payment_status)}>
                  {booking.payment_status}
                </Badge>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Payment Method</p>
                <p className="font-medium">{booking.payment_method || 'N/A'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-gray-500">Payment Reference</p>
                <p className="font-medium">{booking.payment_reference || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.notes && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Notes</h3>
              <p className="text-sm whitespace-pre-wrap">{booking.notes}</p>
            </div>
          )}

          {/* Required Documents Status */}
          {booking.booking_type === 'offline' && (
            <div>
              <h3 className="text-lg font-semibold mb-3">Required Documents</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">DL Front</p>
                  <Badge variant={booking.documents?.dlFront ? 'success' : 'destructive'}>
                    {booking.documents?.dlFront ? 'Provided' : 'Missing'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">DL Back</p>
                  <Badge variant={booking.documents?.dlBack ? 'success' : 'destructive'}>
                    {booking.documents?.dlBack ? 'Provided' : 'Missing'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Aadhaar Front</p>
                  <Badge variant={booking.documents?.aadhaarFront ? 'success' : 'destructive'}>
                    {booking.documents?.aadhaarFront ? 'Provided' : 'Missing'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Aadhaar Back</p>
                  <Badge variant={booking.documents?.aadhaarBack ? 'success' : 'destructive'}>
                    {booking.documents?.aadhaarBack ? 'Provided' : 'Missing'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Customer Photo</p>
                  <Badge variant={booking.documents?.customerPhoto ? 'success' : 'destructive'}>
                    {booking.documents?.customerPhoto ? 'Provided' : 'Missing'}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500">Signature</p>
                  <Badge variant={booking.documents?.signature ? 'success' : 'destructive'}>
                    {booking.documents?.signature ? 'Provided' : 'Missing'}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 