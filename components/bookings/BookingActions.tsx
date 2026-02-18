import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BookingActionsProps {
  bookingId: string;
  currentStatus: string;
  booking?: any;
}

export function BookingActions({ bookingId, currentStatus, booking }: BookingActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);

  // State for enhanced extension
  const [newEndDate, setNewEndDate] = useState('');
  const [additionalAmount, setAdditionalAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [paymentReference, setPaymentReference] = useState('');

  const router = useRouter();

  // Initialize extension values when dialog opens
  const openExtendDialog = () => {
    if (booking?.duration?.to) {
      const currentEnd = new Date(booking.duration.to);
      // Default to +2 hours
      const defaultNewEnd = new Date(currentEnd.getTime() + 2 * 60 * 60 * 1000);

      // Format for datetime-local: YYYY-MM-DDTHH:mm
      const tzOffset = defaultNewEnd.getTimezoneOffset() * 60000;
      const localISOTime = new Date(defaultNewEnd.getTime() - tzOffset).toISOString().slice(0, 16);

      setNewEndDate(localISOTime);

      // Calculate suggested price
      if (booking.amount && booking.duration.from && booking.duration.to) {
        const start = new Date(booking.duration.from);
        const end = new Date(booking.duration.to);
        const currentHours = Math.max(1, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
        const hourlyRate = (booking.rental_amount || booking.amount) / currentHours;
        const suggested = Math.round(hourlyRate * 2);
        setAdditionalAmount(suggested);
      }
    }
    setShowExtendDialog(true);
  };

  // Recalculate price when date changes
  const handleDateChange = (val: string) => {
    setNewEndDate(val);
    if (booking?.duration?.from && booking?.duration?.to && val) {
      const start = new Date(booking.duration.from);
      const oldEnd = new Date(booking.duration.to);
      const newEnd = new Date(val);

      if (newEnd > oldEnd) {
        const currentHours = Math.max(1, (oldEnd.getTime() - start.getTime()) / (1000 * 60 * 60));
        const hourlyRate = (booking.rental_amount || booking.amount) / currentHours;
        const additionalHours = (newEnd.getTime() - oldEnd.getTime()) / (1000 * 60 * 60);
        setAdditionalAmount(Math.round(hourlyRate * additionalHours));
      }
    }
  };

  const updateBookingStatus = async (status: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Booking ${status} successfully`);
        router.refresh();
      } else {
        toast.error(result.error || 'Failed to update booking');
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      toast.error('Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

  const handleExtendBooking = async () => {
    if (!newEndDate) {
      toast.error('Please select a new end date');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/bookings/${bookingId}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newEndDate: new Date(newEndDate).toISOString(),
          additionalAmount,
          paymentMethod,
          paymentReference
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Booking extended successfully');
        setShowExtendDialog(false);
        router.refresh();
        window.location.reload(); // Hard reload to catch status/price changes
      } else {
        toast.error(result.error || 'Failed to extend booking');
      }
    } catch (error) {
      console.error('Error extending booking:', error);
      toast.error('Failed to extend booking');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      updateBookingStatus('cancelled');
    }
  };

  const handleComplete = () => {
    if (window.confirm('Are you sure you want to mark this booking as completed?')) {
      updateBookingStatus('completed');
    }
  };

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {currentStatus === 'active' && (
        <>
          <button
            onClick={openExtendDialog}
            disabled={loading}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
          >
            Extend Booking
          </button>
          <button
            onClick={handleComplete}
            disabled={loading}
            className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-600/20 transition-all flex items-center gap-2"
          >
            Complete Trip
          </button>
        </>
      )}

      {(currentStatus === 'active' || currentStatus === 'confirmed' || currentStatus === 'initiated') && (
        <button
          onClick={handleCancel}
          disabled={loading}
          className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/20 transition-all flex items-center gap-2"
        >
          Cancel Booking
        </button>
      )}

      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-gray-900 uppercase">Extend Booking</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New End Date & Time</label>
              <input
                type="datetime-local"
                value={newEndDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-blue-600">Extension Fee</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={additionalAmount}
                    onChange={(e) => setAdditionalAmount(parseInt(e.target.value) || 0)}
                    className="w-full h-12 pl-8 pr-4 rounded-xl border border-gray-100 bg-gray-50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-blue-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl border border-gray-100 bg-gray-50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer"
                >
                  <option value="upi">UPI</option>
                  <option value="cash">CASH</option>
                  <option value="bank_transfer">BANK TRANSFER</option>
                  <option value="card">CARD</option>
                  <option value="other">OTHER</option>
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Reference</label>
              <input
                type="text"
                placeholder="e.g. Transaction ID or Note"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border border-gray-100 bg-gray-50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowExtendDialog(false)}
              className="flex-1 h-12 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 rounded-xl transition-all"
            >
              Discard
            </button>
            <button
              onClick={handleExtendBooking}
              disabled={loading}
              className="flex-1 h-12 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 disabled:opacity-50 shadow-lg shadow-blue-600/20 transition-all"
            >
              {loading ? 'Processing...' : 'Confirm Extension'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
