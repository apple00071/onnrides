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
  gstEnabled?: boolean;
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
  gstEnabled = false,
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
    const gst = gstEnabled ? Math.round(basePrice * 0.18) : 0;
    const serviceFee = Math.round(basePrice * 0.05);
    const subtotal = basePrice + gst + serviceFee;
    const discountedTotal = subtotal - (couponDiscount || 0);
    const advancePayment = Math.round(discountedTotal * 0.05);
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
  }, [totalAmount, couponDiscount, gstEnabled]);

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-fit">
      {/* Vehicle Details and Booking Time Container */}
      <div className="bg-white rounded-xl shadow-lg p-6 h-fit border border-gray-100">
        {/* Vehicle Details */}
        <div className="flex flex-col">
          {/* Vehicle Name and Location */}
          <h3 className="text-xl font-medium text-gray-900">{vehicle?.name}</h3>
          {vehicle?.location && (
            <div className="flex items-center mt-1 text-gray-600">
              <MapPinIcon className="h-4 w-4 mr-1" />
              <span className="text-sm">{Array.isArray(vehicle.location) ? vehicle.location[0] : vehicle.location}</span>
            </div>
          )}

          {/* Vehicle Image */}
          <div className="relative w-full h-[280px] mt-4">
            {isImageLoading ? (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <Image
                src={imageUrl}
                alt={vehicle?.name || "Vehicle"}
                fill
                className="object-contain"
                priority
              />
            )}
          </div>

          {/* Pickup and Dropoff Times */}
          <div className="mt-6 space-y-2">
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-gray-400 w-4 h-4" />
              <span className="text-gray-600 text-sm">Pickup:</span>
              <span className="text-sm text-gray-900">{formatDate(startDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="text-gray-400 w-4 h-4" />
              <span className="text-gray-600 text-sm">Drop-off:</span>
              <span className="text-sm text-gray-900">{formatDate(endDate)}</span>
            </div>
          </div>

          {/* Additional Details */}
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-gray-700">Km limit</span>
                <span className="text-blue-500 text-sm">(?)
                </span>
              </div>
              <span className="text-gray-900">240 km</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span className="text-gray-700">Excess km charges</span>
                <span className="text-blue-500 text-sm">(?)
                </span>
              </div>
              <span className="text-gray-900">₹7.0/km</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details Container */}
      <div className="bg-white rounded-xl shadow-lg p-6 h-fit border border-gray-100">
        <h4 className="font-medium text-gray-900 mb-4">Payment Details</h4>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Base Amount</span>
            <span className="text-gray-900">{formatCurrency(priceCalculation.basePrice)}</span>
          </div>
          {gstEnabled && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">GST (18%)</span>
              <span className="text-gray-900">{formatCurrency(priceCalculation.gst)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Service Fee (5%)</span>
            <span className="text-gray-900">{formatCurrency(priceCalculation.serviceFee)}</span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600">Coupon Discount</span>
              <span className="text-green-600">-{formatCurrency(couponDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between font-medium text-gray-900 pt-2 border-t">
            <span>Total Amount</span>
            <span>{formatCurrency(priceCalculation.discountedTotal)}</span>
          </div>

          <div className="pt-2 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-orange-500">Online Payment (5%)</span>
              <span className="text-orange-500">{formatCurrency(priceCalculation.advancePayment)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Remaining Payment (At Pickup)</span>
              <span className="text-gray-900">{formatCurrency(priceCalculation.remainingPayment)}</span>
            </div>
          </div>

          <div className="pt-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Enter coupon code"
                value={couponInput}
                onChange={(e) => handleCouponChange(e.target.value)}
                className="rounded-full border-gray-200 focus:ring-orange-500 focus:border-orange-500"
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