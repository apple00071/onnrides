import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BookingActionsProps {
  bookingId: string;
  currentStatus: string;
}

export function BookingActions({ bookingId, currentStatus }: BookingActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);
  const [extendHours, setExtendHours] = useState(1);
  const router = useRouter();

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
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/bookings/${bookingId}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hours: extendHours }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Booking extended successfully');
        setShowExtendDialog(false);
        router.refresh();
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
    <div className="mt-6 flex gap-3">
      {currentStatus === 'active' && (
        <>
          <button
            onClick={() => setShowExtendDialog(true)}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            Extend Booking
          </button>
          <button
            onClick={handleComplete}
            disabled={loading}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
          >
            Complete
          </button>
        </>
      )}
      
      {(currentStatus === 'active' || currentStatus === 'confirmed') && (
        <button
          onClick={handleCancel}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
        >
          Cancel
        </button>
      )}

      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extend Booking</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium text-gray-700">
              Additional Hours
              <input
                type="number"
                min="1"
                value={extendHours}
                onChange={(e) => setExtendHours(parseInt(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowExtendDialog(false)}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleExtendBooking}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Extending...' : 'Extend'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 