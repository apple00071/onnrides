import { useEffect, useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils/currency';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
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
  getValidImageUrl,
  preloadImages
} from '@/lib/utils/image-utils';
import { cn } from '@/lib/utils';
import { Spinner } from '@/components/ui/spinner';
import { Vehicle } from '@/app/types';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';

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
  vehicle?: any;
  startDate: string;
  endDate: string;
  totalAmount: number;
  couponCode?: string;
  couponDiscount?: number;
  onCouponApply?: (code: string) => void;
  onPaymentClick?: () => void;
  onTermsAccept?: () => void;
  gstEnabled?: boolean;
  isLoading?: boolean;
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
  isLoading = false,
}: BookingSummaryProps) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [showTerms, setShowTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      return localStorage.getItem('termsAccepted') === 'true';
    }
    return false;
  });
  const [isImageLoading, setIsImageLoading] = useState(true);
  const [couponInput, setCouponInput] = useState(couponCode || '');
  const [imageUrl, setImageUrl] = useState<string>(DEFAULT_VEHICLE_IMAGE);

  // Calculate booking duration and minimum hours
  const bookingInfo = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const durationHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60));
    const isWeekend = start.getDay() === 0 || start.getDay() === 6;
    const minimumHours = isWeekend ? 24 : 12;

    return {
      durationHours,
      isWeekend,
      minimumHours,
      isMinimumApplied: durationHours < minimumHours
    };
  }, [startDate, endDate]);

  // Memoize price calculations
  const priceCalculation = useMemo(() => {
    const basePrice = totalAmount;
    const gst = gstEnabled ? Math.round(basePrice * 0.18) : 0;
    const serviceFee = Math.round(basePrice * 0.05);
    const subtotal = basePrice + (gstEnabled ? gst : 0) + serviceFee;
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

  // Optimize image loading
  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      if (!vehicle?.images?.length) {
        if (mounted) {
          setImageUrl(DEFAULT_VEHICLE_IMAGE);
          setIsImageLoading(false);
        }
        return;
      }

      try {
        // Preload all vehicle images in parallel
        await preloadImages(vehicle.images);

        if (mounted) {
          const validImageUrl = getValidImageUrl(vehicle.images);
          setImageUrl(validImageUrl);
        }
      } catch (error) {
        if (mounted) {
          console.error('Error loading images:', error);
          setImageUrl(DEFAULT_VEHICLE_IMAGE);
        }
      } finally {
        if (mounted) {
          setIsImageLoading(false);
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [vehicle?.images]);

  const formatDate = useCallback((dateString: string) => {
    const istDate = toIST(new Date(dateString));
    return istDate ? formatDateTimeIST(istDate) : 'Invalid date';
  }, []);

  const handleCouponChange = useCallback((value: string) => {
    setCouponInput(value);
  }, []);

  const handleApplyCoupon = useCallback(() => {
    if (!couponInput.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }
    onCouponApply?.(couponInput);
  }, [couponInput, onCouponApply]);

  const handlePaymentClick = useCallback(() => {
    if (!session) {
      // Save current booking details to localStorage
      const bookingState = {
        vehicleId: vehicle?.id,
        startDate,
        endDate,
        totalAmount,
        couponCode,
        couponDiscount,
        location: vehicle?.location?.[0] || '',
        returnUrl: window.location.href
      };
      localStorage.setItem('pendingBooking', JSON.stringify(bookingState));

      toast.error('Please sign in to proceed with the booking');
      router.push('/auth/signin');
      return;
    }

    if (!termsAccepted) {
      toast.error('Please accept the terms and conditions to proceed');
      setShowTerms(true);
      return;
    }

    onPaymentClick?.();
  }, [session, termsAccepted, router, onPaymentClick, vehicle, startDate, endDate, totalAmount, couponCode, couponDiscount]);

  const handleTermsAccept = useCallback(() => {
    setTermsAccepted(true);
    setShowTerms(false);
    // Store in localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('termsAccepted', 'true');
    }
    onTermsAccept?.();
    toast.success('Terms and conditions accepted');
  }, [onTermsAccept]);

  if (!vehicle) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <Skeleton className="h-[500px] w-full rounded-2xl" />
        <Skeleton className="h-[500px] w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-stretch">
      {/* Vehicle Details Card */}
      <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col border border-gray-100 transition-all hover:shadow-md h-full">
        <div className="flex flex-col">
          <h3 className="text-xl font-medium text-gray-900">{vehicle.name}</h3>
          {vehicle.location && (
            <div className="flex items-center mt-1 text-gray-600">
              <MapPinIcon className="h-4 w-4 mr-1" />
              <span className="text-sm">
                {Array.isArray(vehicle.location) ? vehicle.location[0] : vehicle.location}
              </span>
            </div>
          )}

          <div className="relative w-full h-[280px] mt-4 bg-gray-50 rounded-lg overflow-hidden">
            {isImageLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <Image
                src={imageUrl}
                alt={vehicle.name}
                fill
                className="object-contain mix-blend-multiply"
                priority
                sizes="(max-width: 768px) 100vw, 50vw"
                quality={75}
              />
            )}
          </div>

          <div className="mt-auto pt-6 space-y-3 border-t border-gray-50">
            <div className="flex items-center gap-3 text-gray-600">
              <FaCalendarAlt className="h-4 w-4 text-orange-400" />
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Pickup</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(startDate)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <FaClock className="h-4 w-4 text-orange-400" />
              <div className="flex flex-col">
                <span className="text-xs uppercase tracking-wider text-gray-400 font-semibold">Drop-off</span>
                <span className="text-sm font-medium text-gray-900">{formatDate(endDate)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Details Card */}
      <div className="bg-white rounded-2xl shadow-sm p-8 flex flex-col border border-gray-100 transition-all hover:shadow-md h-full">
        <h4 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <FaRupeeSign className="text-orange-500" />
          Payment Details
        </h4>
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

          <div className="pt-4 mt-2 space-y-3 border-t border-gray-50">
            <div className="flex justify-between items-center">
              <span className="text-orange-600 font-medium">Online Payment (5%)</span>
              <span className="text-orange-600 font-bold text-lg">{formatCurrency(priceCalculation.advancePayment)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Remaining Payment (At Pickup)</span>
              <span className="text-gray-900 font-medium">{formatCurrency(priceCalculation.remainingPayment)}</span>
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
            {!termsAccepted ? (
              <Button
                onClick={() => setShowTerms(true)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900"
              >
                Accept Terms & Conditions
              </Button>
            ) : (
              <Button
                onClick={handlePaymentClick}
                disabled={isLoading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold h-12"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  `Pay ${formatCurrency(priceCalculation.advancePayment)} to Book`
                )}
              </Button>
            )}
            <p className="text-xs text-gray-500 text-center mt-2">
              {termsAccepted ? (
                <>
                  You have accepted our{' '}
                  <button
                    onClick={() => setShowTerms(true)}
                    className="text-orange-500 hover:underline"
                  >
                    terms and conditions
                  </button>
                </>
              ) : (
                'Please accept the terms & conditions to proceed with payment'
              )}
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