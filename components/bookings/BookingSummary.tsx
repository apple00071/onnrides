import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils/currency';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { formatDateTimeIST, toIST } from '@/lib/utils/timezone';
import { Button } from '@/components/ui/button';
import { TermsAndConditionsModal } from './TermsAndConditionsModal';
import { FaMapMarkerAlt, FaCalendarAlt, FaClock, FaRupeeSign } from 'react-icons/fa';
import logger from '@/lib/logger';
import { ExclamationCircleIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { 
  isValidDataUrl, 
  isValidUrl, 
  extractVehicleImage,
  DEFAULT_VEHICLE_IMAGE,
  preloadImage,
  getValidImageUrl
} from '@/lib/utils/image-utils';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { Vehicle } from '@/app/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

// Use the imported default fallback image
const DEFAULT_FALLBACK_IMAGE = DEFAULT_VEHICLE_IMAGE;

// Helper function to parse JSON string if needed
const parseImages = (images: string | string[] | undefined): string[] => {
  if (!images) return [];
  if (Array.isArray(images)) return images;
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [images];
  }
};

interface BookingSummaryProps {
  vehicle?: Vehicle;
  startDate: string;
  endDate: string;
  totalAmount: number;
  couponCode?: string;
  couponDiscount?: number;
  onCouponApply?: (code: string) => void;
  onPaymentClick?: () => void;
  onTermsAccept?: () => void;
}

export function BookingSummary({
  vehicle,
  startDate,
  endDate,
  totalAmount,
  couponCode,
  couponDiscount = 0,
  onCouponApply,
  onPaymentClick,
  onTermsAccept,
}: BookingSummaryProps) {
  const { data: session } = useSession();
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [imageUrl, setImageUrl] = useState<string>(DEFAULT_VEHICLE_IMAGE);

  // Calculate prices including service charges and advance payment
  const priceCalculation = useMemo(() => {
    const basePrice = totalAmount;
    const gst = Math.round(basePrice * 0.18); // 18% GST
    const serviceFee = Math.round(basePrice * 0.05); // 5% Service Fee
    const subtotal = basePrice + gst + serviceFee;
    const discountedTotal = subtotal - (couponDiscount || 0);
    const advancePayment = Math.round(discountedTotal * 0.05); // 5% advance payment
    const remainingPayment = discountedTotal - advancePayment;
    
    return {
      basePrice,
      gst,
      serviceFee,
      subtotal,
      discountedTotal,
      advancePayment,
      remainingPayment
    };
  }, [totalAmount, couponDiscount]);

  useEffect(() => {
    const loadImage = async () => {
      if (!vehicle?.images?.length) {
        setImageUrl(DEFAULT_VEHICLE_IMAGE);
        setIsImageLoading(false);
        return;
      }

      const validImageUrl = getValidImageUrl(vehicle.images);
      
      try {
        if (!validImageUrl.startsWith('data:')) {
          await preloadImage(validImageUrl);
        }
        setImageUrl(validImageUrl);
      } catch (error) {
        console.error('Error loading image:', error);
        setImageUrl(DEFAULT_VEHICLE_IMAGE);
      } finally {
        setIsImageLoading(false);
      }
    };

    loadImage();
  }, [vehicle]);

  const formatDate = (dateString: string) => {
    // First convert to IST, then format
    const istDate = toIST(new Date(dateString));
    return istDate ? formatDateTimeIST(istDate) : 'Invalid date';
  };

  const handleCouponChange = (value: string) => {
    setCouponInput(value);
  };

  const handleApplyCoupon = () => {
    onCouponApply?.(couponInput);
  };

  const handlePaymentClick = () => {
    onPaymentClick?.();
  };

  const handleTermsAccept = () => {
    setTermsAccepted(true);
    setShowTerms(false);
    onTermsAccept?.();
  };

  if (!vehicle) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Vehicle Image and Booking Period Container */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="relative aspect-video w-full overflow-hidden rounded-lg">
          {isImageLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <Image
              src={imageUrl}
              alt={vehicle?.name || "Vehicle"}
              fill
              className="object-cover"
              priority
            />
          )}
        </div>
        <div className="mt-4">
          <h3 className="text-lg font-semibold">{vehicle?.name}</h3>
          {vehicle?.location && (
            <div className="flex items-center mt-2 text-gray-600">
              <MapPinIcon className="h-5 w-5 mr-1" />
              <span>{Array.isArray(vehicle.location) ? vehicle.location[0] : vehicle.location}</span>
            </div>
          )}
        </div>

        <div className="mt-6 border-t pt-4">
          <h4 className="font-medium text-gray-900">Booking Period</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">From:</span>
              <span className="font-medium">{formatDate(startDate)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">To:</span>
              <span className="font-medium">{formatDate(endDate)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details Container */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h4 className="font-medium text-gray-900 mb-4">Payment Details</h4>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>Base Amount</span>
            <span>{formatCurrency(priceCalculation.basePrice)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>GST (18%)</span>
            <span>{formatCurrency(priceCalculation.gst)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Service Fee (5%)</span>
            <span>{formatCurrency(priceCalculation.serviceFee)}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Coupon Discount</span>
              <span>-{formatCurrency(couponDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t">
            <span>Total Amount</span>
            <span>{formatCurrency(priceCalculation.discountedTotal)}</span>
          </div>

          <div className="pt-2 space-y-2">
            <div className="flex justify-between text-sm text-orange-600">
              <span>Online Payment (5%)</span>
              <span>{formatCurrency(priceCalculation.advancePayment)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>Remaining Payment (At Pickup)</span>
              <span>{formatCurrency(priceCalculation.remainingPayment)}</span>
            </div>
          </div>

          <div className="pt-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter coupon code"
                value={couponInput}
                onChange={(e) => handleCouponChange(e.target.value)}
                className="border-gray-200 focus:ring-orange-500 focus:border-orange-500"
              />
              <Button 
                onClick={handleApplyCoupon} 
                variant="outline"
                className="border-gray-200 hover:bg-orange-50 hover:text-orange-600"
              >
                Apply
              </Button>
            </div>
          </div>

          <div className="pt-4">
            <Button 
              onClick={handlePaymentClick} 
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            >
              Pay {formatCurrency(priceCalculation.advancePayment)}
            </Button>
            <p className="text-xs text-gray-500 text-center mt-2">
              By proceeding, you agree to our terms and conditions
            </p>
          </div>
        </div>
      </div>

      <TermsAndConditionsModal 
        isOpen={showTerms} 
        onClose={() => setShowTerms(false)}
        onAccept={handleTermsAccept}
      />
    </div>
  );
} 