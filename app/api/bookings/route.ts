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
import { generateBookingId } from '@/lib/bookingIdGenerator';
import { EmailService } from '@/lib/email/service';
import { WhatsAppService } from '@/lib/whatsapp/service';
import { toUTC } from '@/lib/utils/timezone';
import prisma from '@/lib/prisma';
import { RazorpayOrder } from '@/lib/razorpay';

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
        b.*,
        v.name as vehicle_name,
        v.type as vehicle_type,
        v.location as vehicle_location,
        v.images as vehicle_images,
        v.price_per_hour as vehicle_price_per_hour,
        b.start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as pickup_datetime,
        b.end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as dropoff_datetime,
        b.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as created_at,
        b.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as updated_at
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.user_id = $1
      ORDER BY 
        CASE 
          WHEN b.status = 'confirmed' AND b.payment_status = 'completed' AND b.end_date > CURRENT_TIMESTAMP THEN 1
          WHEN b.status = 'pending' THEN 2
          ELSE 3
        END,
        b.created_at DESC
      LIMIT $2 OFFSET $3
    `, [session.user.id, limit, offset]);

    // Format the bookings
    const bookings = result.rows.map(booking => ({
      id: booking.id,
      booking_id: booking.booking_id,
      status: booking.status,
      start_date: booking.pickup_datetime,
      end_date: booking.dropoff_datetime,
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Validate dates
    const now = new Date();
    const pickupDateTime = new Date(pickupDate);
    const dropoffDateTime = new Date(dropoffDate);

    if (pickupDateTime < now) {
      return NextResponse.json({ 
        success: false, 
        error: 'Pickup date cannot be in the past' 
      }, { status: 400 });
    }

    if (dropoffDateTime <= pickupDateTime) {
      return NextResponse.json({ 
        success: false, 
        error: 'Drop-off date must be after pickup date' 
      }, { status: 400 });
    }

    // Calculate duration in hours
    const durationInHours = Math.ceil(
      (dropoffDateTime.getTime() - pickupDateTime.getTime()) / (1000 * 60 * 60)
    );

    // Convert dates to IST for storage
    const getISTDate = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    };

    // Create booking in database
    const bookingId = 'OR' + Math.random().toString(36).substring(2, 5).toUpperCase();
    const newBooking = await prisma.bookings.create({
      data: {
        id: randomUUID(),
        booking_id: bookingId,
        user_id: session.user.id,
        vehicle_id: vehicleId,
        start_date: pickupDateTime,  // Store as is, PostgreSQL will handle timezone
        end_date: dropoffDateTime,   // Store as is, PostgreSQL will handle timezone
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

    // Create Razorpay order with IST dates in notes
    const order = await createOrder({
      amount: advancePayment * 100,
      currency: 'INR',
      receipt: newBooking.id,
      notes: {
        bookingId: bookingId, // Use the generated bookingId directly to avoid null
        vehicleId: vehicleId,
        pickupDate: getISTDate(pickupDate),
        dropoffDate: getISTDate(dropoffDate),
        customerName: customerDetails.name,
        customerEmail: customerDetails.email,
        customerPhone: customerDetails.phone
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        bookingId: newBooking.booking_id,
        orderId: order.id,
        amount: advancePayment
      }
    });
  } catch (error) {
    logger.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
} 