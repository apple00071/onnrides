import { NextRequest, NextResponse } from 'next/server';

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { nanoid } from 'nanoid';
import { Booking, ApiResponse } from '@/lib/types';
import { randomUUID } from 'crypto';
import Razorpay from 'razorpay';
import { createOrder } from '@/lib/razorpay';
import { generateBookingId } from '@/lib/utils/booking-id';
import { EmailService } from '@/lib/email/service';

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

let razorpayInstance: Razorpay | null = null;
let connectionTested = false;

function getRazorpay() {
  if (razorpayInstance) return razorpayInstance;

  try {
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      logger.warn('Razorpay credentials missing, skipping initialization');
      return null;
    }

    razorpayInstance = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });

    // Only test connection once and not during build
    if (!connectionTested && process.env.NODE_ENV !== 'production') {
      connectionTested = true;
      razorpayInstance.orders.all({ count: 1 })
        .then(() => logger.info('Razorpay connection test successful'))
        .catch((error) => logger.error('Razorpay connection test failed:', {
          message: error.message,
          code: error.code
        }));
    }

    return razorpayInstance;
  } catch (error) {
    logger.error('Failed to initialize Razorpay:', error);
    return null;
  }
}

// Update the interface to support both naming conventions
interface BookingRow {
  id: string;
  bookingId?: string;
  booking_id?: string;
  status: string;
  startDate?: Date;
  start_date?: Date;
  endDate?: Date;
  end_date?: Date;
  formatted_pickup: string;
  formatted_dropoff: string;
  pickup_datetime: Date;
  dropoff_datetime: Date;
  totalAmount?: number;
  total_amount?: number;
  totalPrice?: number;
  total_price?: number;
  paymentStatus?: string;
  payment_status?: string;
  createdAt?: Date;
  created_at?: Date;
  updatedAt?: Date;
  updated_at?: Date;
  vehicleId?: string;
  vehicle_id?: string;
  vehicle_name: string;
  vehicle_type: string;
  vehicle_location: string;
  vehicle_images: string;
  vehiclePricePerHour?: number;
  vehicle_price_per_hour?: number;
  pickup_location?: string;
  dropoff_location?: string;
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
      WHERE user_id = $1
    `, [session.user.id]);

    const totalBookings = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalBookings / limit);

    // Query using snake_case column names
    const result = await query(`
      SELECT 
        b.id, 
        b.booking_id,
        b.status, 
        b.start_date as pickup_datetime,
        b.end_date as dropoff_datetime,
        
        -- Create formatted dates for display (optional, but keep for compatibility if needed)
        b.total_price as total_amount,
        b.payment_status,
        b.created_at,
        b.updated_at,
        b.pickup_location,
        b.dropoff_location,
        v.id as vehicle_id,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.location as vehicle_location,
        v.images as vehicle_images,
        v.price_per_hour as vehicle_price_per_hour
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC
      LIMIT $2 OFFSET $3
    `, [session.user.id, limit, offset]);

    /*
    // Verify data shape
    if (result.rows.length > 0) {
      console.log('DEBUG: First raw row:', result.rows[0]);
    }
    */

    // Update the bookings mapping to handle both column naming conventions
    const bookings = result.rows.map((booking: BookingRow) => {
      const mapped = {
        id: booking.id,
        booking_id: booking.booking_id,
        status: booking.status,
        start_date: booking.pickup_datetime || booking.start_date,
        end_date: booking.dropoff_datetime || booking.end_date,
        pickup_datetime: booking.pickup_datetime || booking.start_date,
        dropoff_datetime: booking.dropoff_datetime || booking.end_date,
        total_price: parseFloat((booking.total_amount || booking.total_price || 0).toString()),
        payment_status: booking.payment_status || 'pending',
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        pickup_location: booking.pickup_location,
        dropoff_location: booking.dropoff_location,
        vehicle: {
          id: booking.vehicle_id,
          name: booking.vehicle_name || 'Vehicle Unavailable',
          type: booking.vehicle_type || 'Unknown',
          location: booking.vehicle_location || 'Not Available',
          images: booking.vehicle_images || '[]',
          price_per_hour: booking.vehicle_price_per_hour || 0
        }
      };
      return mapped;
    });

    /*
    logger.info('Bookings fetched successfully', {
      userId: session.user.id,
      page,
      limit,
      totalBookings,
      bookingsCount: bookings.length
    });
    */

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
      vehicleId,
      pickupDate,
      dropoffDate,
      location,
      customerName,
      customerEmail,
      customerPhone,
      couponCode, // Added couponCode
      // We explicitly IGNORE client-provided pricing fields to prevent manipulation
      // totalAmount, pricePerHour, advancePayment etc. are ignored
    } = data;

    // Validate required fields
    const requiredFields = [
      'vehicleId', 'pickupDate', 'dropoffDate', 'location',
      'customerName', 'customerEmail', 'customerPhone'
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

    // Validate dates using our new validator
    const validationResult = validateBookingDates({
      pickupDate,
      dropoffDate
    });

    if (!validationResult.isValid) {
      return NextResponse.json({
        success: false,
        error: validationResult.errors.map(e => e.message).join(', '),
        validationErrors: validationResult.errors
      }, { status: 400 });
    }

    // Parse dates
    const pickupDateTime = new Date(pickupDate);
    const dropoffDateTime = new Date(dropoffDate);

    // Calculate duration in hours
    const durationInHours = Math.ceil(
      (dropoffDateTime.getTime() - pickupDateTime.getTime()) / (1000 * 60 * 60)
    );

    // Create booking in database with our reusable booking ID generator
    const bookingId = generateBookingId();

    // Check for overlapping bookings AND fetch pricing details in one go
    const availabilityResult = await query(
      `SELECT 
         v.quantity,
         v.price_per_hour,
         v.price_7_days,
         v.price_15_days,
         v.price_30_days,
         COALESCE((
           SELECT COUNT(*)
           FROM bookings b
           WHERE b.vehicle_id = v.id
             AND (
               trim(both '"' from b.pickup_location::text) = $2
               OR b.pickup_location IS NULL
               OR trim(both '"' from b.pickup_location::text) = ''
               OR b.pickup_location::text = 'null'
               OR b.pickup_location::text ILIKE '%"' || $2 || '"%'
             )
             AND b.status NOT IN ('cancelled', 'failed')
             AND (b.payment_status IS NULL OR b.payment_status != 'failed')
             AND (
               (b.start_date - interval '2 hours', b.end_date + interval '2 hours') OVERLAPS ($3::timestamptz, $4::timestamptz)
               OR ($3::timestamptz BETWEEN (b.start_date - interval '2 hours') AND (b.end_date + interval '2 hours'))
               OR ($4::timestamptz BETWEEN (b.start_date - interval '2 hours') AND (b.end_date + interval '2 hours'))
             )
         ), 0) AS overlapping_count
       FROM vehicles v
       WHERE v.id = $1`,
      [vehicleId, location, pickupDateTime.toISOString(), dropoffDateTime.toISOString()]
    );

    if (!availabilityResult.rows.length) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const vehicleData = availabilityResult.rows[0];
    const vehicleQuantity = Number(vehicleData.quantity ?? 1);
    const overlappingCount = Number(vehicleData.overlapping_count ?? 0);

    if (Number.isFinite(vehicleQuantity) && vehicleQuantity > 0 && overlappingCount >= vehicleQuantity) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vehicle is not available at this location for the selected time.',
        },
        { status: 409 }
      );
    }

    // --- SECURE SERVER-SIDE PRICING CALCULATION ---

    // 1. Calculate Base Price
    // Import dynamically to avoid top-level issues if any
    const { calculateRentalPrice, isWeekendIST } = await import('@/lib/utils/price');
    const { getNumericSetting, getBooleanSetting, SETTINGS } = await import('@/lib/settings');

    const pricing = {
      price_per_hour: Number(vehicleData.price_per_hour),
      price_7_days: Number(vehicleData.price_7_days),
      price_15_days: Number(vehicleData.price_15_days),
      price_30_days: Number(vehicleData.price_30_days)
    };

    const isWeekend = isWeekendIST(pickupDateTime);
    const basePrice = calculateRentalPrice(pricing, durationInHours, isWeekend);

    // 2. Fetch Settings
    const [gstEnabled, gstPercentage, serviceFeePercentage, advancePaymentPercentage] = await Promise.all([
      getBooleanSetting(SETTINGS.GST_ENABLED, false),
      getNumericSetting(SETTINGS.BOOKING_GST_PERCENTAGE, 18),
      getNumericSetting(SETTINGS.BOOKING_SERVICE_FEE_PERCENTAGE, 5),
      getNumericSetting(SETTINGS.BOOKING_ADVANCE_PAYMENT_PERCENTAGE, 5)
    ]);

    // 3. Calculate Final Amounts
    const gst = gstEnabled ? Math.round(basePrice * (gstPercentage / 100)) : 0;
    const serviceFee = Math.round(basePrice * (serviceFeePercentage / 100));
    // Apply 5% Special Discount
    const specialDiscount = Math.round(basePrice * 0.05);
    const subtotal = basePrice + gst + serviceFee - specialDiscount;

    // 4. Handle Coupon Application
    let couponDiscount = 0;
    let appliedCoupon = null;

    if (couponCode) {
      const couponResult = await query(
        'SELECT * FROM coupons WHERE UPPER(code) = $1 AND is_active = true',
        [couponCode.toUpperCase()]
      );

      const coupon = couponResult.rows[0];
      const now = new Date();

      if (coupon &&
        (!coupon.start_date || new Date(coupon.start_date) <= now) &&
        (!coupon.end_date || new Date(coupon.end_date) >= now) &&
        (!coupon.usage_limit || coupon.times_used < coupon.usage_limit) &&
        (!coupon.min_booking_amount || subtotal >= Number(coupon.min_booking_amount))) {

        if (coupon.discount_type === 'percentage') {
          couponDiscount = Math.round(subtotal * (Number(coupon.discount_value) / 100));
          if (coupon.max_discount_amount && couponDiscount > Number(coupon.max_discount_amount)) {
            couponDiscount = Number(coupon.max_discount_amount);
          }
        } else {
          couponDiscount = Number(coupon.discount_value);
        }

        appliedCoupon = {
          id: coupon.id,
          code: coupon.code,
          type: coupon.discount_type,
          value: Number(coupon.discount_value),
          discountAmount: couponDiscount
        };
      } else {
        logger.warn('Invalid or inapplicable coupon ignored during booking', {
          couponCode,
          subtotal,
          reason: !coupon ? 'not_found' : 'not_applicable'
        });
      }
    }

    const totalAmount = subtotal - couponDiscount;
    const advancePayment = Math.round(totalAmount * (advancePaymentPercentage / 100));

    logger.info('Server-side pricing calculated:', {
      bookingId,
      basePrice,
      totalAmount,
      advancePayment,
      durationInHours,
      couponApplied: !!appliedCoupon
    });

    try {
      // Update the INSERT query to use snake_case
      const createdBooking = await query(`
        INSERT INTO bookings (
          id, 
          user_id, 
          vehicle_id, 
          start_date, 
          end_date, 
          total_hours, 
          total_price, 
          status, 
          payment_status, 
          pickup_location, 
          booking_id, 
          payment_details, 
          dropoff_location, 
          created_at, 
          updated_at
        )
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
        // Store pickup_location as a plain string
        String(location),
        bookingId,
        null,
        null,
        new Date(),
        new Date()
      ]);

      createdBookingId = createdBooking.rows[0].id;

      // Create Razorpay order with SECURE Advance Payment amount
      const razorpayInstance = getRazorpay();
      if (!razorpayInstance) {
        throw new Error('Razorpay initialization failed - check credentials');
      }

      const razorpayOrder = await razorpayInstance.orders.create({
        amount: Math.round(advancePayment * 100),
        currency: 'INR',
        receipt: createdBookingId,
        notes: {
          bookingId,
          vehicleId,
          startDate: formatDate(pickupDate),
          endDate: formatDate(dropoffDate),
          customerName,
          customerEmail,
          customerPhone,
          couponCode: appliedCoupon?.code || null
        },
      }) as RazorpayOrder;

      // Update the payment details
      await query(`
        UPDATE bookings 
        SET payment_details = $1::jsonb
        WHERE id = $2
      `, [
        JSON.stringify({
          razorpay_order_id: razorpayOrder.id,
          created_at: new Date().toISOString(),
          status: 'created',
          amount: advancePayment,
          amount_paise: razorpayOrder.amount,
          calculation: {
            basePrice,
            gst,
            gstPercentage: gstEnabled ? gstPercentage : 0,
            serviceFee,
            specialDiscount,
            subtotal,
            couponApplied: appliedCoupon,
            totalAmount
          }
        }),
        createdBookingId
      ]);

      // If coupon was applied, increment usage count
      if (appliedCoupon) {
        await query(
          'UPDATE coupons SET times_used = times_used + 1 WHERE id = $1',
          [appliedCoupon.id]
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          bookingId,
          orderId: razorpayOrder.id,
          amount: advancePayment,
          razorpayAmount: razorpayOrder.amount / 100,
          currency: razorpayOrder.currency,
          // Return the trusted total amount so client knows what happened
          totalAmount: totalAmount
        },
      });
    } catch (error) {
      if (createdBookingId) {
        await query(`
          DELETE FROM bookings
          WHERE id = $1
        `, [createdBookingId]);
      }

      // Handle Razorpay errors
      let errorDetails = '';
      if (error instanceof Error) {
        errorDetails = error.message;
      } else if (typeof error === 'object' && error !== null) {
        const errorObj = error as any;
        errorDetails = JSON.stringify({
          message: errorObj.message || 'Unknown error',
          description: errorObj.description
        });
      }

      logger.error('Error creating Razorpay order:', { errorDetails });

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