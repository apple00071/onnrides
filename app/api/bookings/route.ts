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
import { RazorpayOrder } from '@/lib/razorpay';
import { formatIST, formatDateTime, formatDate, formatTime } from '@/lib/utils/time-formatter';
import { validateBookingDates, BookingValidationError } from '@/lib/utils/booking-validator';
import { toISTSql } from '@/lib/utils/sql-helpers';

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

// Add interface for booking row type
interface BookingRow {
  id: string;
  bookingId: string;
  status: string;
  start_date: Date;
  end_date: Date;
  formatted_pickup: string;
  formatted_dropoff: string;
  pickup_datetime: Date;
  dropoff_datetime: Date;
  total_amount: number;
  payment_status: string;
  created_at: Date;
  updated_at: Date;
  vehicle_id: string;
  vehicle_name: string;
  vehicle_type: string;
  vehicle_location: string;
  vehicle_images: string;
  vehicle_price_per_hour: number;
}

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
      WHERE "userId" = $1
    `, [session.user.id]);

    const totalBookings = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalBookings / limit);

    // Get all bookings with vehicle information
    const result = await query(`
      SELECT 
        b.id, 
        b."bookingId", 
        b.status, 
        b."startDate" as start_date, 
        b."endDate" as end_date,
        
        -- Apply IST conversion correctly using AT TIME ZONE
        (b."startDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as pickup_datetime,
        (b."endDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata') as dropoff_datetime,
        
        -- Create formatted dates for display
        TO_CHAR(b."startDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY, FMHH12:MI AM') as formatted_pickup,
        TO_CHAR(b."endDate" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata', 'DD Mon YYYY, FMHH12:MI AM') as formatted_dropoff,
        
        b."totalPrice" as total_amount, 
        b."paymentStatus" as payment_status,
        b."createdAt" as created_at,
        b."updatedAt" as updated_at,
        v.id as vehicle_id,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.location as vehicle_location,
        v.images as vehicle_images,
        v."pricePerHour" as vehicle_price_per_hour
      FROM bookings b
      JOIN vehicles v ON b."vehicleId" = v.id
      WHERE b."userId" = $1
      ORDER BY b."createdAt" DESC
      LIMIT $2 OFFSET $3
    `, [session.user.id, limit, offset]);

    // Format the bookings
    const bookings = result.rows.map((booking: BookingRow) => ({
      id: booking.id,
      booking_id: booking.bookingId,
      status: booking.status,
      start_date: booking.start_date,
      end_date: booking.end_date,
      formatted_pickup: booking.formatted_pickup,
      formatted_dropoff: booking.formatted_dropoff,
      pickup_datetime: booking.pickup_datetime,
      dropoff_datetime: booking.dropoff_datetime,
      total_price: parseFloat(booking.total_amount?.toString() || '0'),
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
  let createdBookingId: string | undefined;
  
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
      customerId,
      vehicleId,
      pickupDate,
      dropoffDate,
      location,
      totalAmount,
      paymentId,
      paymentStatus,
      customerName,
      customerEmail,
      customerPhone,
      vehicleName,
      pricePerHour,
      specialPricing7Days,
      specialPricing15Days,
      specialPricing30Days,
      basePrice,
      gst,
      serviceFee,
      advancePayment
    } = data;

    // Validate required fields
    const requiredFields = [
      'customerId', 'vehicleId', 'pickupDate', 'dropoffDate', 'location', 
      'totalAmount', 'customerName', 'customerEmail', 'customerPhone',
      'vehicleName', 'pricePerHour'
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
    const numericFields = ['totalAmount', 'pricePerHour'];
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
    
    // Replace getCurrentIST usage with new Date()
    const currentTime = new Date();

    if (!validationResult.isValid) {
      logger.warn('Invalid booking dates', { 
        errors: validationResult.errors,
        pickupDate,
        dropoffDate,
        currentTime: formatIST(new Date())
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
      currentTime: formatIST(currentTime)
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
    
    try {
      // Create booking using Prisma's create method
      const createdBooking = await query(`
        INSERT INTO bookings (id, "userId", "vehicleId", "startDate", "endDate", "totalHours", "totalPrice", status, "paymentStatus", "pickupLocation", "bookingId", "paymentDetails", "dropoffLocation", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
      `, [
        randomUUID(),
        session.user.id,
        vehicleId,
        pickupDateTime,
        dropoffDateTime,
        parseFloat(durationInHours.toFixed(2)),
        parseFloat(totalAmount.toFixed(2)),
        'pending',
        'pending',
        JSON.stringify(location),
        bookingId,
        null,
        null,
        new Date(),
        new Date()
      ]);

      createdBookingId = createdBooking.rows[0].id;

      // Create Razorpay order
      const razorpayOrder = await createOrder({
        amount: advancePayment,
        currency: 'INR',
        receipt: createdBookingId,
        notes: {
          bookingId,
          vehicleId,
          startDate: formatDate(pickupDate),
          endDate: formatDate(dropoffDate),
          customerName,
          customerEmail,
          customerPhone
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

      // IMPORTANT FIX: Update the booking with the Razorpay order ID in paymentDetails
      // This is crucial for payment verification to work properly
      await query(`
        UPDATE bookings 
        SET "paymentDetails" = $1::jsonb
        WHERE id = $2
      `, [
        JSON.stringify({
          razorpay_order_id: razorpayOrder.id,
          created_at: new Date().toISOString(),
          status: 'created',
          amount: advancePayment,
          amount_paise: razorpayOrder.amount
        }),
        createdBookingId
      ]);
      
      logger.info('Updated booking with payment details:', {
        bookingId,
        createdBookingId,
        razorpayOrderId: razorpayOrder.id
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
      if (createdBookingId) {
        await query(`
          DELETE FROM bookings
          WHERE id = $1
        `, [createdBookingId]);
      }

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
    logger.error('Error creating booking:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? (error as any).details || {} : {},
      stack: error instanceof Error ? error.stack : undefined
    });
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create booking',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 