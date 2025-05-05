'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { calculateRentalPrice } from '@/lib/utils/price';
import { toast } from 'react-hot-toast';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import { BookingSummary } from '@/components/bookings/BookingSummary';
import logger from '@/lib/logger';
import { initializeRazorpayPayment } from '@/app/providers/RazorpayProvider';
import { toIST, formatISOWithTZ, isWeekendIST } from '@/lib/utils/timezone';
import { formatRazorpayAmount } from '@/app/lib/razorpayAmount';
import { VehicleType, VehicleStatus, Vehicle, BookingSummaryDetails } from '@/app/types';

interface PriceDetails {
  price_per_hour: number;
  price_7_days?: number;
  price_15_days?: number;
  price_30_days?: number;
}

function PendingPaymentAlert({ payment, onClose }: { 
  payment: { 
    order_id: string;
    timestamp: string;
  }; 
  onClose: () => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 max-w-md bg-yellow-50 border border-yellow-200 rounded-lg p-4 shadow-lg">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="ml-3 w-0 flex-1">
          <p className="text-sm font-medium text-yellow-800">
            Unverified Payment Found
          </p>
          <p className="mt-1 text-sm text-yellow-700">
            Order ID: {payment.order_id}
          </p>
          <p className="mt-1 text-xs text-yellow-600">
            Time: {new Date(payment.timestamp).toLocaleString()}
          </p>
          <div className="mt-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(payment.order_id);
                toast.success('Order ID copied to clipboard');
              }}
              className="text-sm font-medium text-yellow-800 hover:text-yellow-700"
            >
              Copy Order ID
            </button>
          </div>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            onClick={onClose}
            className="bg-yellow-50 rounded-md inline-flex text-yellow-400 hover:text-yellow-500 focus:outline-none"
          >
            <span className="sr-only">Close</span>
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// Create a single notification manager
function showNotification(message: string, type: 'success' | 'error' = 'error', options?: any) {
  // Clear any existing notifications first
  toast.dismiss();
  // Show new notification
  if (type === 'success') {
    toast.success(message, options);
  } else {
    toast.error(message, options);
  }
}

const IST_TIMEZONE = 'Asia/Kolkata';

export default function BookingSummaryPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [bookingDetails, setBookingDetails] = useState<BookingSummaryDetails | null>(null);
  const [vehicleDetails, setVehicleDetails] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingVehicle, setIsLoadingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [pendingPayment, setPendingPayment] = useState<any>(null);
  const [vehicleImageUrl, setVehicleImageUrl] = useState<string>('');
  const [showTerms, setShowTerms] = useState(true);
  const [gstEnabled, setGstEnabled] = useState(false);

  useEffect(() => {
    const fetchGstSetting = async () => {
      try {
        const response = await fetch('/api/settings?key=gst_enabled');
        const data = await response.json();
        setGstEnabled(data.data?.value === 'true');
      } catch (error) {
        console.error('Error fetching GST setting:', error);
        setGstEnabled(false);
      }
    };

    fetchGstSetting();
  }, []);

  useEffect(() => {
    const vehicleId = searchParams.get('vehicleId');
    const pickupDate = searchParams.get('pickupDate');
    const dropoffDate = searchParams.get('dropoffDate');

    if (!vehicleId || !pickupDate || !dropoffDate) {
      router.push('/vehicles');
      return;
    }

    // Fetch vehicle details including images
    const fetchVehicleDetails = async () => {
      setIsLoading(true);
      setVehicleDetails(null);
      setIsLoadingVehicle(true);
      setVehicleError(null);

      try {
        logger.info('🔍 Fetching vehicle details', { vehicleId });
        const vehicleResponse = await fetch(`/api/vehicles/${vehicleId}`);
        
        if (!vehicleResponse.ok) {
          throw new Error('Failed to fetch vehicle details');
        }

        // Log the raw response for debugging
        const responseText = await vehicleResponse.text();
        logger.info('🛠️ RAW API RESPONSE INSPECTION:', {
          rawResponseLength: responseText.length,
          firstChars: responseText.substring(0, 50) + '...',
          containsImages: responseText.includes('"images"'),
          imagesRaw: responseText.includes('"images"') ? 
            responseText.substring(
              responseText.indexOf('"images"') + 10, 
              responseText.indexOf('"images"') + 100
            ) + '...' : 'not found'
        });
        
        // Parse the response
        const vehicleDetailsData = JSON.parse(responseText);
        
        const hasImages = vehicleDetailsData.images && 
          (Array.isArray(vehicleDetailsData.images) ? 
            vehicleDetailsData.images.length > 0 : 
            typeof vehicleDetailsData.images === 'string');
            
        logger.info('🟢 Vehicle API response details:', {
          vehicleId: vehicleDetailsData.id,
          name: vehicleDetailsData.name,
          hasImages: !!vehicleDetailsData.images,
          imagesType: typeof vehicleDetailsData.images,
          isImagesArray: Array.isArray(vehicleDetailsData.images),
          imagesCount: Array.isArray(vehicleDetailsData.images) ? 
            vehicleDetailsData.images.length : 'n/a',
        });
        
        setVehicleDetails(vehicleDetailsData);
        
        // Process vehicle image 
        // This is where we need to fix the image processing
        let imageUrl = '';
        
        const processVehicleImage = () => {
          try {
            // Use vehicleDetailsData directly, not vehicleDetails (which may not be updated yet due to state batching)
            const vehicleData = vehicleDetailsData;
            
            if (!vehicleData) {
              logger.warn('No vehicle data available for image processing');
              return ''; // Return empty string instead of fallback
            }
            
            // Log debug information about the vehicle details
            logger.info('🔍 Processing vehicle image for booking', {
              vehicleId,
              vehicleName: vehicleData.name,
              vehicleHasImages: !!vehicleData.images,
              imagesIsArray: Array.isArray(vehicleData.images),
              imagesCount: Array.isArray(vehicleData.images) ? vehicleData.images.length : 0
            });
            
            let imageSource = null;
            
            // Process vehicleData.images which can be an array, JSON string, or regular string
            if (vehicleData.images) {
              // If it's already an array of image URLs
              if (Array.isArray(vehicleData.images) && vehicleData.images.length > 0) {
                imageSource = vehicleData.images[0];
                logger.info('✅ Using first image from array', {
                  source: typeof imageSource === 'string' ? imageSource.substring(0, 50) + '...' : 'non-string value'
                });
              }
              // If it's a string, check if it's a single URL or a JSON string
              else if (typeof vehicleData.images === 'string') {
                const imgStr = vehicleData.images;
                
                // Direct URL (data URL or http URL)
                if (imgStr.startsWith('data:image/') || imgStr.startsWith('http')) {
                  logger.info('✅ Valid direct image URL found', {
                    source: imgStr.substring(0, 50) + '...',
                    type: imgStr.startsWith('data:image/') ? 'data URL' : 'HTTP URL'
                  });
                  imageSource = imgStr;
                } 
                // Try to parse as JSON
                else {
                  try {
                    const parsedImages = JSON.parse(imgStr);
                    if (Array.isArray(parsedImages) && parsedImages.length > 0) {
                      imageSource = parsedImages[0];
                      logger.info('✅ Parsed JSON array image source', {
                        source: typeof imageSource === 'string' ? imageSource.substring(0, 50) + '...' : 'non-string value'
                      });
                    } else {
                      logger.warn('❌ Parsed JSON is not an array or is empty');
                    }
                  } catch (e) {
                    logger.error('❌ Failed to parse image JSON string', {
                      error: e instanceof Error ? e.message : String(e),
                      rawData: imgStr.substring(0, 100) + '...'
                    });
                    // Use the string directly as a last resort
                    if (imgStr.length > 0) {
                      logger.warn('⚠️ Using image string directly as fallback');
                      imageSource = imgStr;
                    }
                  }
                }
              }
              // For any other type of value, log it
              else {
                logger.warn('❓ Unexpected images format', { type: typeof vehicleData.images });
              }
            } else {
              logger.warn('❌ No images found in vehicle data');
            }
            
            // Validate image source is a proper URL string
            const isValidImage = (src: any): boolean => {
              if (!src) return false;
              
              if (typeof src !== 'string') {
                logger.warn('❌ Image source is not a string', { type: typeof src });
                return false;
              }
              
              // Consider data URLs and HTTP URLs as valid
              return src.startsWith('data:image/') || src.startsWith('http') || src.startsWith('/');
            };
            
            // Use the image if it's valid
            if (isValidImage(imageSource)) {
              setVehicleImageUrl(imageSource);
              logger.info('🎯 FINAL BOOKING IMAGE SELECTION', {
                vehicleName: vehicleData.name,
                selectedImage: imageSource.substring(0, 50) + '...',
                imageType: typeof imageSource,
                imageLength: imageSource.length,
                isHttp: imageSource.startsWith('http'),
                isDataUrl: imageSource.startsWith('data:')
              });
              return imageSource;
            }
            
            // Return empty string if no valid image found
            logger.info('⚠️ No valid image found, returning empty string');
            setVehicleImageUrl('');
            return '';
          } catch (error) {
            logger.error('❌ Error processing vehicle image', {
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : 'No stack trace'
            });
            setVehicleImageUrl('');
            return '';
          }
        };
        
        // Process the image
        imageUrl = processVehicleImage();
        
        // Update state directly with the processed image
        setVehicleImageUrl(imageUrl);
        
        // Log final selection
        logger.info('🎯 FINAL BOOKING IMAGE SELECTION:', {
          vehicleName: vehicleDetailsData?.name || 'Unknown Vehicle',
          selectedImage: imageUrl.substring(0, 100) + '...',
          imageType: typeof imageUrl,
          imageLength: imageUrl.length,
          isHttp: imageUrl.startsWith('http'),
          isDataUrl: imageUrl.startsWith('data:'),
          isFallback: imageUrl === ''
        });
        
        // Force update the bookingData with the image
        setBookingDetails(prevData => {
          if (!prevData) return prevData;
          return {
            ...prevData,
            vehicleImage: imageUrl, // Use the processed image URL
            vehicle: {
              name: vehicleDetailsData?.name || '',
              images: imageUrl,
              location: vehicleDetailsData?.location || '',
            }
          };
        });

        // Extract pickup and dropoff dates from the query parameters
        const pickupDateStr = searchParams.get('pickupDate') || '';
        const pickupTimeStr = searchParams.get('pickupTime') || '';
        const dropoffDateStr = searchParams.get('dropoffDate') || '';
        const dropoffTimeStr = searchParams.get('dropoffTime') || '';

        // Parse the dates
        const pickupDateTime = new Date(`${pickupDateStr}T${pickupTimeStr}`);
        const dropoffDateTime = new Date(`${dropoffDateStr}T${dropoffTimeStr}`);

        // Calculate duration in hours if dates are valid
        if (!isNaN(pickupDateTime.getTime()) && !isNaN(dropoffDateTime.getTime())) {
          const durationInHours = Math.ceil(
            (dropoffDateTime.getTime() - pickupDateTime.getTime()) / (1000 * 60 * 60)
          );
          
          // Log the duration calculation
          logger.info('Duration calculation:', {
            pickupDateTime: pickupDateTime.toISOString(),
            dropoffDateTime: dropoffDateTime.toISOString(),
            durationInHours
          });
        }
      } catch (error) {
        logger.error('🔴 Error fetching vehicle details:', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        setVehicleError(error instanceof Error ? error.message : 'Failed to load vehicle details');
        toast.error('Failed to load vehicle details. Please try again later.');
      } finally {
        setIsLoading(false);
        setIsLoadingVehicle(false);
      }
    };

    fetchVehicleDetails();
  }, [searchParams, router]);

  useEffect(() => {
    if (searchParams) {
      const vehicleId = searchParams.get('vehicleId') || '';
      const vehicleName = searchParams.get('vehicleName') || '';
      const location = searchParams.get('location') || '';
      const pickupDate = searchParams.get('pickupDate') || '';
      const pickupTime = searchParams.get('pickupTime') || '';
      const dropoffDate = searchParams.get('dropoffDate') || '';
      const dropoffTime = searchParams.get('dropoffTime') || '';
      const pricePerHour = Number(searchParams.get('pricePerHour')) || 0;
      const price7Days = Number(searchParams.get('price7Days')) || 0;
      const price15Days = Number(searchParams.get('price15Days')) || 0;
      const price30Days = Number(searchParams.get('price30Days')) || 0;

      setBookingDetails({
        vehicleId,
        vehicleName,
        location,
        pickupDate,
        pickupTime,
        dropoffDate,
        dropoffTime,
        pricePerHour,
        price7Days,
        price15Days,
        price30Days,
        vehicle: {
          name: vehicleName,
          images: vehicleImageUrl || '',
          location: location
        }
      });
    }
  }, [searchParams, vehicleImageUrl]);

  useEffect(() => {
    // Check for pending payment in localStorage
    const storedPayment = localStorage.getItem('pendingPayment');
    if (storedPayment) {
      try {
        const payment = JSON.parse(storedPayment);
        // Only show payments from the last 24 hours
        const paymentTime = new Date(payment.timestamp).getTime();
        const now = new Date().getTime();
        const hoursSincePayment = (now - paymentTime) / (1000 * 60 * 60);
        
        if (hoursSincePayment < 24) {
          setPendingPayment(payment);
        } else {
          // Remove old pending payments
          localStorage.removeItem('pendingPayment');
        }
      } catch (error) {
        logger.error('Error parsing pending payment:', error);
        localStorage.removeItem('pendingPayment');
      }
    }
  }, []);

  // Add an effect to update the vehicleImageUrl when vehicleDetails change
  useEffect(() => {
    if (vehicleDetails && vehicleDetails.images) {
      let processedImageUrl = '';
      
      // Log the raw data we're working with for debugging
      console.log('Processing vehicleDetails images:', {
        imagesType: typeof vehicleDetails.images,
        isArray: Array.isArray(vehicleDetails.images),
        dataLook: Array.isArray(vehicleDetails.images) 
          ? `Array with ${vehicleDetails.images.length} items` 
          : typeof vehicleDetails.images === 'string'
            ? (vehicleDetails.images as string).substring(0, 30) + '...'
            : typeof vehicleDetails.images
      });
      
      if (Array.isArray(vehicleDetails.images) && vehicleDetails.images.length > 0) {
        // If it's an array, use the first item
        const firstImage = vehicleDetails.images[0];
        processedImageUrl = firstImage;
        console.log('Using first image from array:', firstImage);
      } else if (typeof vehicleDetails.images === 'string') {
        // If it's a string, check if it's JSON
        const imagesStr = vehicleDetails.images as string;
        try {
          if (imagesStr.startsWith('[')) {
            const parsedImages = JSON.parse(imagesStr);
            if (Array.isArray(parsedImages) && parsedImages.length > 0) {
              processedImageUrl = parsedImages[0];
              console.log('Using first image from parsed JSON string:', processedImageUrl);
            }
          } else if (imagesStr.startsWith('http') || imagesStr.startsWith('/')) {
            // Direct URL
            processedImageUrl = imagesStr;
            console.log('Using direct image URL:', processedImageUrl);
          }
        } catch (e) {
          console.error('Error parsing images JSON:', e);
          if (imagesStr.includes('https:') || imagesStr.includes('http:')) {
            // It might be a URL string with quoting issues, try to extract it
            const urlMatch = imagesStr.match(/(https?:\/\/[^"']+)/);
            if (urlMatch && urlMatch[1]) {
              processedImageUrl = urlMatch[1];
              console.log('Extracted URL from string:', processedImageUrl);
            }
          }
        }
      }
      
      // Validate the URL format
      if (processedImageUrl && (processedImageUrl.startsWith('http') || processedImageUrl.startsWith('/'))) {
        console.log('Setting valid vehicle image URL:', processedImageUrl);
        setVehicleImageUrl(processedImageUrl);
      } else {
        console.warn('No valid image URL found, using fallback');
        setVehicleImageUrl('');
      }
    }
  }, [vehicleDetails]);

  const handleProceedToPayment = async () => {
    setIsLoading(true);
    try {
      if (!session?.user) {
        toast.error('Please sign in to continue');
        return;
      }

      if (!bookingDetails) {
        router.push('/vehicles');
        return;
      }

      // Log the raw time data selected by the user
      console.log('Raw booking time data:', {
        pickupDate: bookingDetails.pickupDate,
        pickupTime: bookingDetails.pickupTime,
        dropoffDate: bookingDetails.dropoffDate,
        dropoffTime: bookingDetails.dropoffTime,
      });

      // Parse the dates preserving the exact time the user selected
      // We DON'T need to apply time zone conversion here since these are the actual times the user wants
      const pickupDateTime = new Date(`${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`);
      const dropoffDateTime = new Date(`${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`);

      // Calculate duration only if both dates are valid
      let duration = 0;
      if (!isNaN(pickupDateTime.getTime()) && !isNaN(dropoffDateTime.getTime())) {
        duration = Math.ceil(
          (dropoffDateTime.getTime() - pickupDateTime.getTime()) / (1000 * 60 * 60)
        );
      } else {
        logger.warn('Invalid dates for duration calculation', {
          pickupDateTime,
          dropoffDateTime
        });
        throw new Error('Invalid booking dates');
      }
      
      // Check if pickup date is a weekend
      const isWeekend = pickupDateTime.getDay() === 0 || pickupDateTime.getDay() === 6;
      
      // Create a pricing object with the pricing details
      const pricing = {
        price_per_hour: bookingDetails.pricePerHour,
        price_7_days: Number(searchParams.get('price7Days')) || 0,
        price_15_days: Number(searchParams.get('price15Days')) || 0,
        price_30_days: Number(searchParams.get('price30Days')) || 0
      };
      
      // Calculate total price using the special pricing logic
      const basePrice = calculateRentalPrice(pricing, duration, isWeekend);
      
      // Calculate additional charges
      const gst = gstEnabled ? basePrice * 0.18 : 0;
      const serviceFee = basePrice * 0.05;
      const totalPrice = basePrice + gst + serviceFee;

      // Calculate advance payment (exactly 5% of total price)
      const advancePayment = Math.round(totalPrice * 0.05);
      
      logger.info('Payment calculation:', {
        basePrice,
        gst,
        serviceFee,
        totalPrice,
        advancePayment,
        advancePaymentPercentage: `${(advancePayment / totalPrice * 100).toFixed(1)}%`
      });

      // IMPORTANT FIX: Send ISO strings WITHOUT timezone indicators
      // Just use the raw date objects' ISO strings - the API will handle the timezone conversion
      const pickupDateISO = pickupDateTime.toISOString();
      const dropoffDateISO = dropoffDateTime.toISOString();

      // Debug logging for date information
      logger.info('Booking dates:', {
        original: {
          pickupDateStr: bookingDetails.pickupDate,
          pickupTimeStr: bookingDetails.pickupTime,
          dropoffDateStr: bookingDetails.dropoffDate,
          dropoffTimeStr: bookingDetails.dropoffTime,
        },
        parsed: {
          pickupTime: `${pickupDateTime.getHours()}:${pickupDateTime.getMinutes()}`,
          dropoffTime: `${dropoffDateTime.getHours()}:${dropoffDateTime.getMinutes()}`,
          pickupDate: pickupDateTime.toDateString(),
          dropoffDate: dropoffDateTime.toDateString(),
        },
        formatted: {
          pickupDateISO,
          dropoffDateISO,
          pickupHours: pickupDateTime.getHours(),
          pickupMinutes: pickupDateTime.getMinutes(),
          dropoffHours: dropoffDateTime.getHours(),
          dropoffMinutes: dropoffDateTime.getMinutes(),
        }
      });

      // Create booking
      const bookingResponse = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: session.user.id,
          vehicleId: bookingDetails.vehicleId,
          pickupDate: pickupDateISO,
          dropoffDate: dropoffDateISO,
          location: bookingDetails.location,
          totalAmount: totalPrice,
          paymentId: '', // Will be updated after payment
          paymentStatus: 'pending',
          customerName: session.user.name || '',
          customerEmail: session.user.email || '',
          customerPhone: (session.user as any)?.phone || '',
          vehicleName: bookingDetails.vehicleName,
          pricePerHour: bookingDetails.pricePerHour,
          specialPricing7Days: bookingDetails.price7Days || null,
          specialPricing15Days: bookingDetails.price15Days || null,
          specialPricing30Days: bookingDetails.price30Days || null,
          basePrice,
          gst,
          serviceFee,
          advancePayment
        }),
      });

      if (!bookingResponse.ok) {
        const errorData = await bookingResponse.json();
        logger.error('Booking creation failed:', { 
          status: bookingResponse.status,
          error: errorData 
        });
        
        // Create a more user-friendly error message
        let errorMessage = 'Failed to create booking';
        if (errorData?.error) {
          errorMessage = errorData.error;
        }
        if (errorData?.details) {
          // Try to parse the error details for more information
          try {
            const detailsObj = typeof errorData.details === 'string' && 
                              errorData.details.startsWith('{') ? 
                              JSON.parse(errorData.details) : null;
                              
            if (detailsObj?.message) {
              errorMessage = `${errorMessage}: ${detailsObj.message}`;
            } else if (typeof errorData.details === 'string') {
              errorMessage = `${errorMessage}: ${errorData.details}`;
            }
          } catch (e) {
            // If we can't parse it, just use the string
            if (typeof errorData.details === 'string') {
              errorMessage = `${errorMessage}: ${errorData.details}`;
            }
          }
        }
        
        throw new Error(errorMessage);
      }

      const bookingResult = await bookingResponse.json();
      logger.info('Booking response:', bookingResult);

      // Extract payment data from the response
      const paymentData = bookingResult.data || bookingResult;
      
      if (!paymentData.orderId || !paymentData.bookingId) {
        logger.error('Invalid payment data:', paymentData);
        throw new Error('Invalid payment data received');
      }

      // Log payment details before initializing
      logger.info('Initializing payment with data:', {
        orderId: paymentData.orderId,
        bookingId: paymentData.bookingId,
        originalAmount: advancePayment, // This is the INR amount (5% of total)
        razorpayAmount: paymentData.razorpayAmount, // This is the actual amount in INR
        razorpayAmountPaise: (paymentData.razorpayAmount * 100) // Convert to paise for debugging
      });

      // Need to display a toast if there's a minimum amount adjustment
      if (paymentData.razorpayAmount !== undefined && 
          paymentData.amount !== undefined && 
          paymentData.razorpayAmount !== paymentData.amount) {
        toast.custom(
          (
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 rounded shadow-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-orange-800">
                    Due to payment processor requirements, a minimum fee of ₹1 will be charged. Your actual advance amount is ₹{advancePayment}
                  </p>
                </div>
              </div>
            </div>
          ),
          { duration: 6000 }
        );
      }

      // We need to convert the amount to paise for Razorpay
      // This should be handled on the server, but we'll ensure it here as well
      const paymentAmountInPaise = Math.round(paymentData.razorpayAmount * 100);
      
      logger.info('Final payment amount calculation:', {
        originalAdvanceINR: advancePayment,
        razorpayAmountINR: paymentData.razorpayAmount,
        amountToSendToPaiseFE: paymentAmountInPaise
      });
      
      // Initialize Razorpay payment with the amount in paise
      await initializeRazorpayPayment({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
        amount: paymentAmountInPaise, // Amount in paise
        currency: 'INR',
        orderId: paymentData.orderId,
        bookingId: paymentData.bookingId,
        prefill: {
          name: session.user.name || undefined,
          email: session.user.email || undefined,
          contact: (session.user as any)?.phone || undefined
        }
      });

    } catch (error) {
      logger.error('Payment error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to process payment');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total amount based on booking details
  const totalAmount = useMemo(() => {
    if (!bookingDetails) return 0;

    const pickupDateTime = new Date(`${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`);
    const dropoffDateTime = new Date(`${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`);
    
    // Calculate duration in hours
    const durationInHours = Math.ceil(
      (dropoffDateTime.getTime() - pickupDateTime.getTime()) / (1000 * 60 * 60)
    );

    return calculateRentalPrice(
      {
        price_per_hour: bookingDetails.pricePerHour,
        price_7_days: bookingDetails.price7Days,
        price_15_days: bookingDetails.price15Days,
        price_30_days: bookingDetails.price30Days
      },
      durationInHours,
      isWeekendIST(pickupDateTime)
    );
  }, [bookingDetails]);

  if (!bookingDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pickupDateTime = new Date(`${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`);
  const dropoffDateTime = new Date(`${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`);
  const duration = Math.ceil(
    (dropoffDateTime.getTime() - pickupDateTime.getTime()) / (1000 * 60 * 60)
  );
  
  // Calculate base price with minimum duration rules and special pricing
  const isWeekend = pickupDateTime.getDay() === 0 || pickupDateTime.getDay() === 6;
  
  // Create a pricing object with the pricing details
  const pricing = {
    price_per_hour: bookingDetails.pricePerHour,
    price_7_days: Number(searchParams.get('price7Days')) || 0,
    price_15_days: Number(searchParams.get('price15Days')) || 0,
    price_30_days: Number(searchParams.get('price30Days')) || 0
  };
  
  // Calculate total price using the special pricing logic
  const basePrice = calculateRentalPrice(pricing, duration, isWeekend);
  
  // Calculate additional charges
  const gst = gstEnabled ? basePrice * 0.18 : 0;
  const serviceFee = basePrice * 0.05;
  const totalPrice = basePrice + gst + serviceFee;

  // Create booking object with properly processed image from vehicle details
  const booking = {
    vehicle: {
      name: vehicleDetails?.name || 'Vehicle',
      image: vehicleImageUrl || '', // Don't use fallback image
      location: bookingDetails.location || 'Unknown'
    },
    start_date: pickupDateTime?.toISOString() || '',
    end_date: dropoffDateTime?.toISOString() || '',
    duration: duration,
    total_price: totalPrice,
    base_price: basePrice,
    gst: gst,
    service_fee: serviceFee
  };

  // Add this debug log to see the final image being used
  console.log('FINAL BOOKING OBJECT IMAGE:', {
    vehicleImageUrl,
    urlType: typeof vehicleImageUrl,
    urlLength: vehicleImageUrl?.length || 0,
    isDataUrl: vehicleImageUrl?.startsWith('data:') || false,
    isHttp: vehicleImageUrl?.startsWith('http') || false,
    isLocal: vehicleImageUrl?.startsWith('/') || false
  });

  // Enhanced debugging of final image choice
  logger.info('🎯 FINAL BOOKING IMAGE SELECTION:', {
    vehicleName: booking.vehicle.name,
    selectedImage: booking.vehicle.image,
    imageType: typeof booking.vehicle.image,
    imageLength: booking.vehicle.image?.length,
    isHttp: booking.vehicle.image?.startsWith('http'),
    isHttps: booking.vehicle.image?.startsWith('https'),
    isDataUrl: booking.vehicle.image?.startsWith('data:'),
    isRelativePath: booking.vehicle.image && !booking.vehicle.image.startsWith('http') && !booking.vehicle.image.startsWith('data:'),
    isFallback: booking.vehicle.image === ''
  });

  return (
    <div className="container mx-auto px-4 py-8">
      {pendingPayment && (
        <PendingPaymentAlert 
          payment={pendingPayment} 
          onClose={() => setPendingPayment(null)} 
        />
      )}

      {isLoading ? (
        <div className="flex justify-center items-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : vehicleError ? (
        <div className="text-center text-red-600">{vehicleError}</div>
      ) : vehicleDetails && bookingDetails ? (
        <BookingSummary
          vehicle={vehicleDetails}
          startDate={`${bookingDetails.pickupDate}T${bookingDetails.pickupTime}`}
          endDate={`${bookingDetails.dropoffDate}T${bookingDetails.dropoffTime}`}
          totalAmount={totalAmount}
          onPaymentClick={handleProceedToPayment}
          onTermsAccept={() => setShowTerms(false)}
          gstEnabled={gstEnabled}
        />
      ) : null}
    </div>
  );
}