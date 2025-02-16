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
    <div>
      <h1 className="text-2xl font-bold">SUMMARY</h1>

      <div className="grid grid-cols-2 gap-8 mt-6">
        {/* Left Column */}
        <div>
          <div className="bg-gray-50 p-4 rounded-lg">
            {booking.vehicle?.image && (
              <img
                src={booking.vehicle.image}
                alt={booking.vehicle.name}
                className="w-full h-64 object-contain"
              />
            )}
          </div>

          <div className="mt-6">
            <h2 className="text-xl font-semibold">{booking.vehicle.name}</h2>
            
            <div className="flex items-center justify-between mt-4">
              <div>
                <p className="font-medium text-gray-900">Pickup</p>
                <p className="text-xl">{pickupDateTime.time}</p>
                <p className="text-gray-600">{pickupDateTime.date}</p>
              </div>
              <div className="text-gray-400">to</div>
              <div className="text-right">
                <p className="font-medium text-gray-900">Drop-off</p>
                <p className="text-xl">{dropoffDateTime.time}</p>
                <p className="text-gray-600">{dropoffDateTime.date}</p>
              </div>
            </div>

            {booking.vehicle.location && (
              <div className="mt-4">
                <p className="text-gray-600">
                  Location: <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{booking.vehicle.location}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div>
          <h3 className="text-xl font-semibold mb-6">Billing Details</h3>
          
          <div className="space-y-6">
            <div>
              <p className="mb-2">Apply Coupon</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  placeholder="Enter coupon code"
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <button
                  onClick={handleApplyCoupon}
                  className="px-6 py-2 bg-[#f26e24] text-white rounded-md hover:bg-[#e85d1c] transition-colors"
                >
                  APPLY
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Vehicle Rental Charges</span>
                <span>₹{formatAmount(booking.base_price || booking.total_price * 0.81)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST (18%)</span>
                <span>₹{formatAmount(booking.gst || booking.total_price * 0.15)}</span>
              </div>
              <div className="flex justify-between">
                <span>Service Fee (5%)</span>
                <span>₹{formatAmount(booking.service_fee || booking.total_price * 0.04)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t">
                <span>Total Due</span>
                <span>₹{formatAmount(booking.total_price)}</span>
              </div>
            </div>

            <button
              onClick={handleProceed}
              disabled={isLoading}
              className="w-full py-3 bg-[#f26e24] text-white rounded-md hover:bg-[#e85d1c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Proceed to Payment'}
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