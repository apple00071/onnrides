import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { TermsAndConditionsModal } from './TermsAndConditionsModal';
import logger from '@/lib/logger';
import { formatCurrency } from '@/lib/utils/currency-formatter';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/time-formatter';

interface BookingSummaryProps {
  booking: {
    vehicle: {
      name: string;
      image: string;
      location: string;
    };
    start_date: string;
    end_date: string;
    duration: number;
    total_price: number;
    base_price: number;
    gst: number;
    service_fee: number;
  };
  onProceedToPayment: () => void;
}

export function BookingSummary({ booking, onProceedToPayment }: BookingSummaryProps) {
  const { data: session } = useSession();
  const [showTerms, setShowTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const imageLoadAttempted = useRef(false);

  // Log the image URL on component mount
  useEffect(() => {
    if (!booking.vehicle.image) {
      logger.warn('No vehicle image URL provided');
      return;
    }

    logger.info('Vehicle image in BookingSummary:', { 
      imageUrl: booking.vehicle.image,
      vehicleName: booking.vehicle.name
    });
    
    // Only attempt to preload once if it's not a data URL
    if (!imageLoadAttempted.current && !booking.vehicle.image.startsWith('data:')) {
      imageLoadAttempted.current = true;
      
      try {
        // Create a new image element to preload
        const img = new window.Image();
        
        img.onload = () => {
          logger.info('Image preloaded successfully:', { src: booking.vehicle.image });
          setImageError(false);
          setImageLoaded(true);
        };
        
        img.onerror = (error) => {
          logger.warn('Failed to preload image:', { 
            src: booking.vehicle.image,
            error: error.toString()
          });
          setImageError(true);
        };
        
        // Set src after defining handlers
        img.src = booking.vehicle.image;
      } catch (error) {
        logger.error('Error during image preload:', error);
        setImageError(true);
      }
    }
  }, [booking.vehicle.image, booking.vehicle.name]);

  // Calculate advance payment and remaining amount
  const advancePayment = Math.round(booking.total_price * 0.05);
  const remainingPayment = booking.total_price - advancePayment;

  // Get image source with proper validation
  const getImageSource = () => {
    if (imageError || !booking.vehicle.image) {
      return '/images/placeholder-vehicle.png'; // Using a known placeholder
    }
    return booking.vehicle.image;
  };

  // Check if the image is a data URL
  const isDataUrl = (url: string) => {
    return url.startsWith('data:');
  };

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

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6">
        <h2 className="text-2xl font-semibold mb-6">Booking Summary</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Container: Vehicle and Booking Details */}
          <div className="space-y-8">
            {/* Vehicle Details Section */}
            <div>
              {/* Hero Image Container */}
              <div className="relative w-full h-[280px] bg-gray-50 rounded-lg overflow-hidden mb-6">
                <div className="absolute inset-0 flex items-center justify-center">
                  {isDataUrl(getImageSource()) ? (
                    // Render a regular img element for data URLs
                    <img
                      src={getImageSource()}
                      alt={booking.vehicle.name}
                      className="max-h-full max-w-full object-contain"
                      onError={() => {
                        logger.warn('Vehicle image (data URL) failed to load', {
                          imageUrl: 'data:URL (truncated)'
                        });
                        setImageError(true);
                      }}
                    />
                  ) : (
                    // Use Next.js Image for regular URLs
                    <Image
                      src={getImageSource()}
                      alt={booking.vehicle.name}
                      fill
                      className="object-contain"
                      sizes="100vw"
                      priority={true}
                      loading="eager"
                      quality={100}
                      unoptimized={true} // Skip Next.js image optimization for faster loading
                      onError={() => {
                        logger.warn('Vehicle image failed to load in Next Image component', {
                          imageUrl: booking.vehicle.image
                        });
                        setImageError(true);
                      }}
                      onLoad={() => {
                        logger.info('Vehicle image loaded successfully in Next Image component', {
                          imageUrl: booking.vehicle.image
                        });
                        setImageLoaded(true);
                      }}
                    />
                  )}
                </div>
              </div>
              
              {/* Vehicle Info */}
              <div>
                <h3 className="text-2xl font-semibold">{booking.vehicle.name}</h3>
                <p className="text-gray-600 mt-2">Location: {booking.vehicle.location}</p>
              </div>
            </div>

            {/* Booking Details */}
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-gray-600">Pickup</p>
                  <p className="font-medium">{formatDateTime(booking.start_date)}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-600">Drop-off</p>
                  <p className="font-medium">{formatDateTime(booking.end_date)}</p>
                </div>
              </div>
              <div>
                <p className="text-gray-600">Duration</p>
                <p className="font-medium">{booking.duration} hours</p>
              </div>
            </div>
          </div>

          {/* Right Container: Payment Details */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6">Payment Details</h3>
            
            {/* Price Breakdown */}
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Base Price</span>
                <span>{formatCurrency(booking.base_price)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST (18%)</span>
                <span>{formatCurrency(booking.gst)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Service Fee</span>
                <span>{formatCurrency(booking.service_fee)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-gray-200 pt-4">
                <span>Total Amount</span>
                <span>{formatCurrency(booking.total_price)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600 border-t border-gray-200 pt-4">
                <span>Advance Payment (5%)</span>
                <span>{formatCurrency(advancePayment)}</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-8">
              <Button 
                onClick={handleProceed}
                disabled={isLoading}
                className="w-full bg-[#f26e24] hover:bg-[#e05d13] text-white"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  'Pay Advance & Confirm Booking'
                )}
              </Button>
            </div>
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