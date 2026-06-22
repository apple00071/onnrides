import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarIcon } from 'lucide-react';
import { format, startOfToday } from 'date-fns';
import { cn } from '@/lib/utils';

interface BookingActionsProps {
  bookingId: string;
  currentStatus: string;
  booking?: any;
}

export function BookingActions({ bookingId, currentStatus, booking }: BookingActionsProps) {
  const [loading, setLoading] = useState(false);
  const [showExtendDialog, setShowExtendDialog] = useState(false);

  // State for enhanced extension
  const [extendDate, setExtendDate] = useState('');
  const [extendTime, setExtendTime] = useState('');
  const [additionalAmount, setAdditionalAmount] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState('paid');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [paymentReference, setPaymentReference] = useState('');

  // State for enhanced cancellation
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [refundProcessed, setRefundProcessed] = useState(true);
  const [refundAmount, setRefundAmount] = useState(0);
  const [refundMethod, setRefundMethod] = useState('upi');

  const router = useRouter();

  // Initialize extension values when dialog opens
  const openExtendDialog = () => {
    if (booking?.duration?.to) {
      const currentEnd = new Date(booking.duration.to);
      // Default to +2 hours
      const defaultNewEnd = new Date(currentEnd.getTime() + 2 * 60 * 60 * 1000);

      setExtendDate(format(defaultNewEnd, 'yyyy-MM-dd'));
      setExtendTime(format(defaultNewEnd, 'HH:mm'));

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

  // Recalculate price when date or time changes
  const recalculateExtensionFee = (dateStr: string, timeStr: string) => {
    if (booking?.duration?.from && booking?.duration?.to && dateStr && timeStr) {
      const start = new Date(booking.duration.from);
      const oldEnd = new Date(booking.duration.to);
      const newEnd = new Date(`${dateStr}T${timeStr}`);

      if (newEnd > oldEnd) {
        const currentHours = Math.max(1, (oldEnd.getTime() - start.getTime()) / (1000 * 60 * 60));
        const hourlyRate = (booking.rental_amount || booking.amount) / currentHours;
        const additionalHours = (newEnd.getTime() - oldEnd.getTime()) / (1000 * 60 * 60);
        setAdditionalAmount(Math.round(hourlyRate * additionalHours));
      } else {
        setAdditionalAmount(0);
      }
    }
  };

  const handleExtendDateChange = (dateStr: string) => {
    setExtendDate(dateStr);
    recalculateExtensionFee(dateStr, extendTime);
  };

  const handleExtendTimeChange = (timeStr: string) => {
    setExtendTime(timeStr);
    recalculateExtensionFee(extendDate, timeStr);
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
    if (!extendDate || !extendTime) {
      toast.error('Please select a new end date & time');
      return;
    }

    const newEndDateTime = new Date(`${extendDate}T${extendTime}`);
    const originalEnd = new Date(booking.duration.to);

    if (newEndDateTime <= originalEnd) {
      toast.error('New end date & time must be after the current drop-off date & time');
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
          newEndDate: newEndDateTime.toISOString(),
          additionalAmount,
          paymentStatus,
          paymentMethod: paymentStatus === 'paid' ? paymentMethod : undefined,
          paymentReference: paymentStatus === 'paid' ? paymentReference : undefined
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

  const openCancelDialog = () => {
    const paid = booking?.paid_amount || 0;
    setRefundProcessed(paid > 0);
    setRefundAmount(paid);
    setRefundMethod(booking?.payment_method || 'upi');
    setCancellationReason('');
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async () => {
    if (!cancellationReason.trim()) {
      toast.error('Please provide a reason for cancellation');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/admin/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'cancelled',
          modification_reason: cancellationReason,
          refund_processed: refundProcessed,
          refund_amount: refundProcessed ? refundAmount : 0,
          refund_method: refundProcessed ? refundMethod : undefined,
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('Booking cancelled successfully');
        setShowCancelDialog(false);
        router.refresh();
        window.location.reload();
      } else {
        toast.error(result.error || 'Failed to cancel booking');
      }
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast.error('Failed to cancel booking');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnVehicle = () => {
    router.push(`/admin/vehicle-returns/new?bookingId=${bookingId}`);
  };

  const getTimeOptions = () => {
    const options = [];
    for (let i = 0; i < 48; i++) {
      const h = Math.floor(i / 2);
      const m = (i % 2) * 30;

      if (booking?.duration?.to && extendDate) {
        const originalEnd = new Date(booking.duration.to);
        const selectedDate = new Date(extendDate);
        originalEnd.setHours(0, 0, 0, 0);
        selectedDate.setHours(0, 0, 0, 0);

        if (selectedDate.getTime() === originalEnd.getTime()) {
          const originalEndTime = new Date(booking.duration.to);
          const originalHour = originalEndTime.getHours();
          const originalMinute = originalEndTime.getMinutes();
          if (h * 60 + m <= originalHour * 60 + originalMinute) continue;
        }
      }

      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      const period = h >= 12 ? 'PM' : 'AM';
      const value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
      const label = `${h12.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')} ${period}`;
      options.push({ value, label });
    }
    return options;
  };

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {currentStatus === 'active' && (
        <>
          <button
            onClick={openExtendDialog}
            disabled={loading}
            className="px-6 py-2.5 bg-orange-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-orange-600 disabled:opacity-50 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
          >
            Extend Booking
          </button>
          <button
            onClick={handleReturnVehicle}
            disabled={loading}
            className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-600/20 transition-all flex items-center gap-2"
          >
            Return Vehicle
          </button>
        </>
      )}

      {(currentStatus === 'active' || currentStatus === 'confirmed' || currentStatus === 'initiated') && (
        <button
          onClick={openCancelDialog}
          disabled={loading}
          className="px-6 py-2.5 bg-red-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/20 transition-all flex items-center gap-2"
        >
          Cancel Booking
        </button>
      )}

      <Dialog open={showExtendDialog} onOpenChange={setShowExtendDialog}>
        <DialogContent className="max-w-md rounded-2xl bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-gray-900 uppercase">Extend Booking</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">New End Date & Time</label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal h-12 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-100/50 text-gray-800 hover:text-gray-900 transition-colors",
                        !extendDate && "text-gray-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate whitespace-nowrap">
                        {extendDate ? format(new Date(extendDate), "dd MMM yyyy") : "Select Date"}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white text-gray-900" align="start">
                    <Calendar
                      mode="single"
                      selected={extendDate ? new Date(extendDate) : undefined}
                      onSelect={(date) => {
                        if (date) {
                          handleExtendDateChange(format(date, 'yyyy-MM-dd'));
                        } else {
                          handleExtendDateChange('');
                        }
                      }}
                      disabled={(date) => {
                        if (booking?.duration?.to) {
                          const originalEnd = new Date(booking.duration.to);
                          originalEnd.setHours(0, 0, 0, 0);
                          return date < originalEnd;
                        }
                        return date < startOfToday();
                      }}
                    />
                  </PopoverContent>
                </Popover>

                <Select 
                  value={extendTime} 
                  onValueChange={handleExtendTimeChange}
                >
                  <SelectTrigger className="w-32 h-12 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-bold text-gray-800 hover:bg-gray-100/50">
                    <SelectValue placeholder="Time" />
                  </SelectTrigger>
                  <SelectContent className="bg-white text-gray-900">
                    {getTimeOptions().map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 text-orange-600">Extension Fee</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={additionalAmount}
                    onChange={(e) => setAdditionalAmount(parseInt(e.target.value) || 0)}
                    className="w-full h-12 pl-8 pr-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-orange-700"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="w-full h-12 px-3 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer text-gray-800"
                >
                  <option value="paid">PAID</option>
                  <option value="unpaid">UNPAID (Add to Due)</option>
                </select>
              </div>
            </div>

            {paymentStatus === 'paid' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Method</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-12 px-3 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all cursor-pointer text-gray-800"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">CASH</option>
                    <option value="bank_transfer">BANK TRANSFER</option>
                    <option value="card">CARD</option>
                    <option value="other">OTHER</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Payment Reference</label>
                  <input
                    type="text"
                    placeholder="Transaction ID"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all text-gray-800"
                  />
                </div>
              </div>
            )}
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
              className="flex-1 h-12 bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 disabled:opacity-50 shadow-lg shadow-orange-500/20 transition-all"
            >
              {loading ? 'Processing...' : 'Confirm Extension'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent className="max-w-md rounded-2xl bg-white text-gray-900">
          <DialogHeader>
            <DialogTitle className="text-xl font-black tracking-tight text-gray-900 uppercase">Cancel Booking</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Booking Summary Card */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Booking ID:</span>
                <span className="font-bold text-gray-700">{booking?.booking_id || bookingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Customer:</span>
                <span className="font-bold text-gray-700">{booking?.customer?.name || 'N/A'} ({booking?.customer?.phone || 'N/A'})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Vehicle:</span>
                <span className="font-bold text-gray-700">{booking?.vehicle?.name || 'N/A'}</span>
              </div>
              <div className="h-px bg-gray-200 my-2" />
              <div className="flex justify-between">
                <span className="text-gray-400 font-bold uppercase tracking-wider">Total Booking Amount:</span>
                <span className="font-bold text-gray-800">₹{booking?.total_amount || booking?.amount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-600 font-bold uppercase tracking-wider">Amount Paid:</span>
                <span className="font-black text-green-700">₹{booking?.paid_amount || 0}</span>
              </div>
            </div>

            {/* Refund toggle */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Is refund applicable?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setRefundProcessed(true);
                    setRefundAmount(booking?.paid_amount || 0);
                  }}
                  className={cn(
                    "h-11 rounded-xl text-xs font-bold transition-all border",
                    refundProcessed
                      ? "bg-green-50 border-green-500 text-green-700 shadow-sm"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  Yes, Process Refund
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRefundProcessed(false);
                    setRefundAmount(0);
                  }}
                  className={cn(
                    "h-11 rounded-xl text-xs font-bold transition-all border",
                    !refundProcessed
                      ? "bg-red-50 border-red-500 text-red-700 shadow-sm"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  )}
                >
                  No Refund
                </button>
              </div>
            </div>

            {/* Refund fields (only if processed) */}
            {refundProcessed && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Refund Amount (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full h-11 px-4 rounded-xl border border-gray-200 bg-gray-50/50 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-red-500/20 text-gray-800 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Refund Method</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500/20 text-gray-800 transition-all cursor-pointer"
                  >
                    <option value="upi">UPI</option>
                    <option value="cash">CASH</option>
                    <option value="bank_transfer">BANK TRANSFER</option>
                    <option value="card">CARD</option>
                  </select>
                </div>
              </div>
            )}

            {/* Reason for Cancellation */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Reason for Cancellation *</label>
              <textarea
                placeholder="Enter cancellation reason for logs and customer notification..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
                className="w-full p-3 rounded-xl border border-gray-200 bg-gray-50/50 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 text-gray-800 transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setShowCancelDialog(false)}
              className="flex-1 h-12 text-xs font-black uppercase tracking-widest text-gray-500 hover:bg-gray-50 rounded-xl transition-all"
            >
              Discard
            </button>
            <button
              onClick={handleConfirmCancel}
              disabled={loading}
              className="flex-1 h-12 bg-red-600 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 shadow-lg shadow-red-600/20 transition-all"
            >
              {loading ? 'Processing...' : 'Confirm Cancel'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
