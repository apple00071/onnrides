import { NextRequest, NextResponse } from 'next/server';
import { getNumericSetting, SETTINGS } from '@/lib/settings';
import logger from '@/lib/logger';

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// Handle GET request
export async function GET(request: NextRequest) {
  try {
    // Add CORS headers to the response
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
      'Content-Type': 'application/json',
    };

    // Get query parameters using URL constructor
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Get base booking details
    const pickupDate = searchParams.get('pickupDate');
    const dropoffDate = searchParams.get('dropoffDate');
    const location = searchParams.get('location');
    const vehicleId = searchParams.get('vehicleId');
    const vehicleName = searchParams.get('vehicleName');
    const pricePerHour = parseFloat(searchParams.get('pricePerHour') || '0');
    const price7Days = parseFloat(searchParams.get('price7Days') || '0');
    const price15Days = parseFloat(searchParams.get('price15Days') || '0');
    const price30Days = parseFloat(searchParams.get('price30Days') || '0');

    // Calculate duration in hours
    const pickupDateTime = new Date(pickupDate || '');
    const dropoffDateTime = new Date(dropoffDate || '');
    const durationInHours = Math.ceil(
      (dropoffDateTime.getTime() - pickupDateTime.getTime()) / (1000 * 60 * 60)
    );

    // Calculate base price based on duration
    let basePrice = 0;
    if (durationInHours <= 168) { // 7 days
      basePrice = price7Days > 0 ? price7Days : pricePerHour * durationInHours;
    } else if (durationInHours <= 360) { // 15 days
      basePrice = price15Days > 0 ? price15Days : pricePerHour * durationInHours;
    } else if (durationInHours <= 720) { // 30 days
      basePrice = price30Days > 0 ? price30Days : pricePerHour * durationInHours;
    } else {
      basePrice = pricePerHour * durationInHours;
    }

    // Fetch configurable rates from settings with defaults as fallback
    const gstPercentage = await getNumericSetting(SETTINGS.BOOKING_GST_PERCENTAGE, 18);
    const serviceFeePercentage = await getNumericSetting(SETTINGS.BOOKING_SERVICE_FEE_PERCENTAGE, 5);
    const advancePaymentPercentage = await getNumericSetting(SETTINGS.BOOKING_ADVANCE_PAYMENT_PERCENTAGE, 5);

    logger.debug('Using configurable rates:', {
      gstPercentage,
      serviceFeePercentage,
      advancePaymentPercentage
    });

    // Calculate fees and taxes
    const gst = Math.round(basePrice * (gstPercentage / 100));
    const serviceFee = Math.round(basePrice * (serviceFeePercentage / 100));
    const totalAmount = basePrice + gst + serviceFee;
    const advancePayment = Math.round(totalAmount * (advancePaymentPercentage / 100));

    const bookingSummary = {
      pickupDate,
      dropoffDate,
      location,
      vehicleId,
      vehicleName,
      pricePerHour,
      durationInHours,
      pricing: {
        basePrice,
        gst,
        serviceFee,
        totalAmount,
        advancePayment,
        percentages: {
          gst: gstPercentage,
          serviceFee: serviceFeePercentage,
          advancePayment: advancePaymentPercentage
        },
        specialPricing: {
          sevenDays: price7Days,
          fifteenDays: price15Days,
          thirtyDays: price30Days
        }
      }
    };

    // Return the response with CORS headers
    return new NextResponse(
      JSON.stringify({ 
        success: true, 
        data: bookingSummary 
      }),
      { headers }
    );
  } catch (error) {
    logger.error('Error in booking summary:', error);
    
    // Return error response with CORS headers
    return new NextResponse(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
          'Content-Type': 'application/json',
        }
      }
    );
  }
} 