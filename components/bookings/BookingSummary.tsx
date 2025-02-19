import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { TermsAndConditionsModal } from './TermsAndConditionsModal';
import logger from '@/lib/logger';

interface BookingSummaryProps {
  booking: {
    vehicle: {
      name: string;
      image?: string;
      location?: string;
    };
    start_date: string;
    end_date: string;
    total_price: number;
    base_price?: number;
    gst?: number;
    service_fee?: number;
  };
  onProceedToPayment: () => void;
}

export function BookingSummary({ booking, onProceedToPayment }: BookingSummaryProps) {
  const { data: session } = useSession();
  const [showTerms, setShowTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [couponCode, setCouponCode] = useState('');

  const handleProceed = () => {
    logger.debug('Proceed button clicked', { hasSession: !!session?.user });
    
    if (!session?.user) {
      toast.error('Please sign in to continue with the booking');
      return;
    }
    
    logger.debug('Showing terms modal');
    setShowTerms(true);
  };

  const handleAcceptTerms = async () => {
    logger.debug('Terms accepted, proceeding to payment');
    setTermsAccepted(true);
    setShowTerms(false);
    
    setIsLoading(true);
    try {
      await onProceedToPayment();
    } catch (error) {
      logger.error('Error processing booking:', error);
      toast.error('Failed to process booking');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseTerms = () => {
    logger.debug('Closing terms modal');
    setShowTerms(false);
  };

  const handleApplyCoupon = () => {
    // Add coupon logic here
    toast.error('Coupon functionality not implemented yet');
  };

  // Format amount to 2 decimal places
  const formatAmount = (amount: number) => {
    return Number(amount).toFixed(2);
  };

  // Format date and time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      time: format(date, 'h:mm a'),
      date: format(date, 'MMM d, yyyy')
    };
  };

  const pickupDateTime = formatDateTime(booking.start_date);
  const dropoffDateTime = formatDateTime(booking.end_date);

  return (
    <div className="space-y-4 sm:space-y-6">
      <h1 className="text-lg sm:text-2xl font-bold text-gray-900">Booking Summary</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Vehicle Details */}
        <div className="bg-white rounded-lg border p-4">
          <div className="bg-gray-50 rounded-lg mb-4">
            {booking.vehicle?.image && (
              <img
                src={booking.vehicle.image}
                alt={booking.vehicle.name}
                className="w-full h-48 sm:h-64 object-contain"
              />
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold">{booking.vehicle.name}</h2>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="font-medium text-gray-900">Pickup</p>
                <p className="text-lg sm:text-xl">{pickupDateTime.time}</p>
                <p className="text-gray-600">{pickupDateTime.date}</p>
              </div>
              <div className="hidden sm:block text-gray-400">to</div>
              <div className="sm:text-right">
                <p className="font-medium text-gray-900">Drop-off</p>
                <p className="text-lg sm:text-xl">{dropoffDateTime.time}</p>
                <p className="text-gray-600">{dropoffDateTime.date}</p>
              </div>
            </div>

            {booking.vehicle.location && (
              <div>
                <p className="text-gray-600">
                  Location: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{booking.vehicle.location}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Billing Details */}
        <div className="bg-white rounded-lg border p-4">
          <h3 className="text-lg sm:text-xl font-semibold mb-4">Billing Details</h3>
          
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm sm:text-base">Apply Coupon</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter coupon code"
                  className="flex-1 px-3 py-2 border rounded-md text-sm"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="px-4 sm:px-6 py-2 bg-[#f26e24] text-white rounded-md hover:bg-[#e85d1c] transition-colors text-sm sm:text-base"
                >
                  APPLY
                </button>
              </div>
            </div>

            <div className="space-y-3 border-t pt-3">
              <div className="flex justify-between text-sm sm:text-base">
                <span>Base Price</span>
                <span className="text-gray-900">{formatAmount(booking.base_price || booking.total_price * 0.81)}</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base">
                <span>GST (18%)</span>
                <span className="text-gray-900">{formatAmount(booking.gst || booking.total_price * 0.15)}</span>
              </div>
              <div className="flex justify-between text-sm sm:text-base">
                <span>Service Fee (5%)</span>
                <span className="text-gray-900">{formatAmount(booking.service_fee || booking.total_price * 0.04)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-base sm:text-lg">
                <span>Total Amount</span>
                <span className="text-gray-900">{formatAmount(booking.total_price)}</span>
              </div>
              <p className="text-xs text-gray-500 text-right">Inclusive of all taxes</p>
            </div>

            <button
              onClick={handleProceed}
              disabled={isLoading}
              className="w-full py-3 sm:py-4 mt-4 bg-[#f26e24] text-white rounded-md hover:bg-[#e85d1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-medium flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                'Proceed to Payment'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Terms & Conditions Modal */}
      <TermsAndConditionsModal
        isOpen={showTerms}
        onClose={handleCloseTerms}
        onAccept={handleAcceptTerms}
      />
    </div>
  );
} 