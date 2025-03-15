import { NextRequest, NextResponse } from 'next/server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { nanoid } from 'nanoid';
import { Booking, ApiResponse } from '@/lib/types';
import { randomUUID } from 'crypto';
import Razorpay from 'razorpay';
import { createOrder } from '@/lib/razorpay';
import { generateBookingId } from '@/lib/utils/booking-id';
import { EmailService } from '@/lib/email/service';
import { WhatsAppService } from '@/app/lib/whatsapp/service';
import { toUTC } from '@/lib/utils/timezone';
import prisma from '@/lib/prisma';
import { RazorpayOrder } from '@/lib/razorpay';
import { formatIST, formatISTDateOnly, formatISTTimeOnly, isDateInFuture, getCurrentIST } from '@/lib/utils/time-formatter';
import { validateBookingDates, BookingValidationError } from '@/lib/utils/booking-validator';
import { toISTSql } from '@/lib/utils/sql-helpers';
import { formatDateToIST } from '@/lib/utils'; // Keep this import for backward compatibility

// Define standard support contact info
const SUPPORT_EMAIL = 'contact@onnrides.com';
const SUPPORT_PHONE = '8309031203';

const isDevelopment = process.env.NODE_ENV === 'development';

type BookingBody = {
  vehicle_id: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  total_hours: number;
  total_price: number;
  location?: string;
};

interface CreateBookingBody {
  vehicleId: string;
  pickupDate: string;
  dropoffDate: string;
  location: string;
  totalPrice: number;
  customerDetails: {
    name: string;
    email: string;
    phone: string;
  };
}

// Initialize Razorpay
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// Validate environment variables
logger.info('Checking Razorpay configuration:', {
  keyIdExists: !!RAZORPAY_KEY_ID,
  keyIdLength: RAZORPAY_KEY_ID?.length,
  keySecretExists: !!RAZORPAY_KEY_SECRET,
  keySecretLength: RAZORPAY_KEY_SECRET?.length,
  keyIdPrefix: RAZORPAY_KEY_ID?.substring(0, 6),
  environment: process.env.NODE_ENV
});

let razorpay: Razorpay | null = null;
try {
  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    throw new Error('Missing Razorpay credentials');
  }
  
  logger.info('Initializing Razorpay with:', {
    keyId: RAZORPAY_KEY_ID.substring(0, 6) + '...',
    keyLength: RAZORPAY_KEY_ID.length,
    secretLength: RAZORPAY_KEY_SECRET.length
  });

  razorpay = new Razorpay({
    key_id: RAZORPAY_KEY_ID,
    key_secret: RAZORPAY_KEY_SECRET,
  });

  // Test the Razorpay connection
  razorpay.orders.all()
    .then(() => {
      logger.info('Razorpay connection test successful');
    })
    .catch((error) => {
      logger.error('Razorpay connection test failed:', {
        error,
        message: error.message,
        description: error.description,
        code: error.code
      });
    });
} catch (error) {
  logger.error('Failed to initialize Razorpay:', {
    error,
    message: error instanceof Error ? error.message : 'Unknown error',
    keyIdExists: !!RAZORPAY_KEY_ID,
    keySecretExists: !!RAZORPAY_KEY_SECRET
  });
}

// Replace any custom date formatting with our standardized function
// Use our new formatIST function but maintain backward compatibility
const formatDate = (date: Date) => formatIST(date);

// GET /api/bookings - List user's bookings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get URL parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Get total count for pagination
    const countResult = await query(`
      SELECT COUNT(*) 
      FROM bookings 
      WHERE user_id = $1
    `, [session.user.id]);

    const totalBookings = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalBookings / limit);

    // Get all bookings with vehicle information
    const result = await query(`
      SELECT 
        b.id, 
        b.booking_id, 
        b.status, 
        b.start_date, 
        b.end_date,
        
        -- Apply IST conversion correctly using AT TIME ZONE
        (b.start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as pickup_datetime,
        (b.end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as dropoff_datetime,
        
        -- Create formatted dates for display
        TO_CHAR(b.start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY, FMHH12:MI AM') as formatted_pickup,
        TO_CHAR(b.end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY, FMHH12:MI AM') as formatted_dropoff,
        
        b.total_price, 
        b.payment_status,
        b.created_at,
        b.updated_at,
        v.id as vehicle_id,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.location as vehicle_location,
        v.images as vehicle_images,
        v.price_per_hour as vehicle_price_per_hour
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `, [session.user.id, limit, offset]);

    // Format the bookings
    const bookings = result.rows.map(booking => ({
      id: booking.id,
      booking_id: booking.booking_id,
      status: booking.status,
      // Use the original UTC dates, client-side will apply IST conversion
      start_date: booking.start_date,
      end_date: booking.end_date,
      // Include formatted date fields for optional usage
      formatted_pickup: booking.formatted_pickup,
      formatted_dropoff: booking.formatted_dropoff,
      // Include IST-converted fields as separate properties
      pickup_datetime: booking.pickup_datetime,
      dropoff_datetime: booking.dropoff_datetime,
      total_price: parseFloat(booking.total_price || 0),
      payment_status: booking.payment_status || 'pending',
      created_at: booking.created_at,
      updated_at: booking.updated_at,
      vehicle: {
        id: booking.vehicle_id,
        name: booking.vehicle_name,
        type: booking.vehicle_type,
        location: booking.vehicle_location,
        images: booking.vehicle_images,
        price_per_hour: booking.vehicle_price_per_hour
      }
    }));

    logger.info('Bookings fetched successfully', {
      userId: session.user.id,
      page,
      limit,
      totalBookings,
      bookingsCount: bookings.length
    });

    return NextResponse.json({
      success: true,
      data: bookings,
      pagination: {
        total: totalBookings,
        page,
        limit,
        totalPages
      }
    });

  } catch (error) {
    logger.error('Error fetching bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// POST /api/bookings - Create booking
export async function POST(request: NextRequest): Promise<Response> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const data = await request.json();
    const {
      vehicleId,
      pickupDate,
      dropoffDate,
      location,
      totalPrice,
      advancePayment,
      basePrice,
      gst,
      serviceFee,
      customerDetails
    } = data;

    // Validate required fields
    const requiredFields = [
      'vehicleId', 'pickupDate', 'dropoffDate', 'location', 
      'totalPrice', 'advancePayment', 'basePrice', 'gst', 'serviceFee'
    ];
    
    const missingFields = requiredFields.filter(field => data[field] === undefined);
    
    if (missingFields.length > 0) {
      logger.warn('Missing required fields for booking creation', { 
        missingFields,
        providedFields: Object.keys(data)
      });
      
      return NextResponse.json({ 
        success: false, 
        error: `Missing required fields: ${missingFields.join(', ')}` 
      }, { status: 400 });
    }

    // Validate numeric fields
    const numericFields = ['totalPrice', 'advancePayment', 'basePrice', 'gst', 'serviceFee'];
    const invalidFields = numericFields.filter(field => {
      const value = Number(data[field]);
      return isNaN(value) || value < 0;
    });
    
    if (invalidFields.length > 0) {
      logger.warn('Invalid numeric fields for booking creation', { 
        invalidFields,
        values: invalidFields.reduce((acc, field) => {
          acc[field] = data[field];
          return acc;
        }, {} as Record<string, any>)
      });
      
      return NextResponse.json({ 
        success: false, 
        error: `Invalid numeric fields: ${invalidFields.join(', ')}` 
      }, { status: 400 });
    }

    // Validate dates using our new validator
    const validationResult = validateBookingDates({
      pickupDate,
      dropoffDate
    });
    
    if (!validationResult.isValid) {
      logger.warn('Invalid booking dates', { 
        errors: validationResult.errors,
        pickupDate,
        dropoffDate,
        currentTime: formatIST(getCurrentIST())
      });
      
      return NextResponse.json({ 
        success: false, 
        error: validationResult.errors.map(e => e.message).join(', '),
        validationErrors: validationResult.errors
      }, { status: 400 });
    }
    
    // Parse dates directly from the ISO strings
    const pickupDateTime = new Date(pickupDate);
    const dropoffDateTime = new Date(dropoffDate);
    
    // Log the dates for debugging
    logger.info('Date validation and parsing:', {
      received: {
        pickupDate,
        dropoffDate
      },
      parsed: {
        pickupDateTime: formatIST(pickupDateTime),
        dropoffDateTime: formatIST(dropoffDateTime)
      },
      currentTime: formatIST(getCurrentIST())
    });
    
    // Calculate duration in hours
    const durationInHours = Math.ceil(
      (dropoffDateTime.getTime() - pickupDateTime.getTime()) / (1000 * 60 * 60)
    );

    // Create booking in database with our reusable booking ID generator
    const bookingId = generateBookingId();
    
    // IMPORTANT FIX: Store the dates as is without any timezone adjustment
    // These dates represent the exact times the user selected
    logger.info('Storing dates in database:', {
      dates: {
        pickup: pickupDateTime.toISOString(),
        dropoff: dropoffDateTime.toISOString(),
        pickupHours: pickupDateTime.getUTCHours(),
        pickupMinutes: pickupDateTime.getUTCMinutes(),
        dropoffHours: dropoffDateTime.getUTCHours(),
        dropoffMinutes: dropoffDateTime.getUTCMinutes(),
      }
    });
    
    const booking = await prisma.bookings.create({
      data: {
        id: randomUUID(),
        booking_id: bookingId,
        user_id: session.user.id,
        vehicle_id: vehicleId,
        start_date: pickupDateTime,  // Store the date as is - no timezone adjustment
        end_date: dropoffDateTime,   // Store the date as is - no timezone adjustment
        total_hours: durationInHours,
        total_price: totalPrice,
        status: 'pending',
        payment_status: 'pending',
        payment_details: JSON.stringify({
          base_price: basePrice,
          gst: gst,
          service_fee: serviceFee,
          advance_payment: advancePayment
        }),
        pickup_location: location
      }
    });

    // Use exactly 5% for advance payment (no minimum enforced)
    // Note: This might trigger a Razorpay minimum amount error for very small bookings
    logger.info('Creating Razorpay order:', {
      advancePayment,
      advancePercentage: `${(advancePayment / totalPrice * 100).toFixed(1)}%`,
      totalPrice,
      bookingId
    });
    
    // Create Razorpay order
    try {
      // For advance payments greater than ₹1, don't apply minimum amount logic
      const isAboveMinimum = advancePayment >= 1;
      
      logger.info('Creating Razorpay order:', {
        advancePayment,
        advancePercentage: `${(advancePayment / totalPrice * 100).toFixed(1)}%`,
        totalPrice,
        bookingId,
        isAboveMinimum
      });
      
      const razorpayOrder = await createOrder({
        amount: advancePayment,
        currency: 'INR',
        receipt: booking.id,
        notes: {
          bookingId,
          vehicleId,
          pickupDate: formatDate(new Date(pickupDate)),
          dropoffDate: formatDate(new Date(dropoffDate)),
          customerName: customerDetails.name,
          customerEmail: customerDetails.email,
          customerPhone: customerDetails.phone,
          skipMinimumCheck: isAboveMinimum ? 'true' : 'false'
        },
      });

      // Log the actual order details
      logger.info('Razorpay order created:', {
        orderId: razorpayOrder.id,
        originalAmount: advancePayment,
        razorpayAmount: razorpayOrder.amount / 100, // Convert paise to INR for logging
        razorpayAmountOriginal: razorpayOrder.amount, // Original paise amount
        currency: razorpayOrder.currency
      });

      // Return booking ID and payment information
      return NextResponse.json({
        success: true,
        data: {
          bookingId,
          orderId: razorpayOrder.id,
          amount: advancePayment,  // Original amount calculated (5% of total) in INR
          razorpayAmount: razorpayOrder.amount / 100,  // Actual amount in Razorpay in INR
          razorpayAmountPaise: razorpayOrder.amount, // The actual amount in paise (for debugging)
          currency: razorpayOrder.currency,
        },
      });
    } catch (error) {
      // Properly format Razorpay errors which might have a different structure
      let errorDetails = '';
      
      if (error instanceof Error) {
        errorDetails = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle Razorpay API errors which come as objects with specific properties
        const errorObj = error as any;
        errorDetails = JSON.stringify({
          message: errorObj.message || 'Unknown error',
          description: errorObj.description,
          code: errorObj.code,
          status: errorObj.status
        });
      } else {
        errorDetails = String(error);
      }
      
      logger.error('Error creating Razorpay order:', {
        error: typeof error === 'object' ? JSON.stringify(error) : error,
        errorDetails
      });
      
      // Delete the booking if payment initialization fails
      await prisma.bookings.delete({
        where: { id: booking.id },
      });

      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create payment order',
          details: errorDetails
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error instanceof Error ? (error as any).details || {} : {};
    
    logger.error('Error creating booking:', {
      error: errorMessage,
      details: errorDetails,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { success: false, error: 'Failed to create booking', message: errorMessage },
      { status: 500 }
    );
  }
} 