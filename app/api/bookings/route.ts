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
    logger.info('GET /api/bookings - Fetching user bookings');

    const session = await getServerSession(authOptions);
    logger.info('Session check:', {
      hasSession: !!session,
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email
      } : null
    });

    if (!session?.user) {
      logger.error('Unauthorized access attempt');
      return NextResponse.json({ 
        success: false,
        error: 'Authentication required',
        details: 'User session not found'
      }, { status: 401 });
    }

    const result = await query(`
      SELECT 
        b.*,
        v.name as vehicle_name,
        v.location as vehicle_location,
        v.type as vehicle_type,
        v.images as vehicle_images,
        v.price_per_hour as vehicle_price_per_hour,
        b.start_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as start_date,
        b.end_date AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as end_date,
        b.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as created_at,
        b.updated_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata' as updated_at,
        COALESCE(b.booking_id, 'OR' || SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 3)) as booking_id
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.user_id = $1 
      ORDER BY b.created_at DESC
    `, [session.user.id]);
    
    logger.info('Database query completed', {
      rowCount: result.rows.length
    });
    
    // Log raw data for debugging
    if (result.rows.length > 0) {
      logger.info('First booking raw data:', {
        firstBooking: JSON.stringify(result.rows[0], null, 2)
      });
    }
    
    const bookings = result.rows.map(booking => {
      return {
        id: booking.id,
        booking_id: booking.booking_id,
        status: booking.status,
        start_date: booking.start_date,
        end_date: booking.end_date,
        total_price: parseFloat(booking.total_price),
        payment_status: booking.payment_status,
        created_at: booking.created_at,
        updated_at: booking.updated_at,
        vehicle: {
          id: booking.vehicle_id,
          name: booking.vehicle_name,
          type: booking.vehicle_type,
          location: booking.vehicle_location,
          images: booking.vehicle_images,
          price_per_hour: parseFloat(booking.vehicle_price_per_hour || 0)
        }
      };
    });
    
    // Log transformed data for debugging
    if (bookings.length > 0) {
      logger.info('First booking transformed data:', {
        firstBooking: JSON.stringify(bookings[0], null, 2)
      });
    }
    
    return NextResponse.json({ 
      success: true,
      data: bookings
    });
  } catch (error) {
    logger.error('Error fetching bookings:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch bookings',
      details: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
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

    // Convert IST dates to UTC for database storage
    const pickupDateUTC = toUTC(pickupDate);
    const dropoffDateUTC = toUTC(dropoffDate);

    // Calculate duration in hours
    const durationInHours = Math.ceil(
      (dropoffDateUTC.getTime() - pickupDateUTC.getTime()) / (1000 * 60 * 60)
    );

    // Create booking in database
    const newBooking = await prisma.bookings.create({
      data: {
        id: randomUUID(),
        user_id: session.user.id,
        vehicle_id: vehicleId,
        start_date: pickupDateUTC,
        end_date: dropoffDateUTC,
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

    // Create Razorpay order
    const order = await createOrder({
      amount: Math.round(advancePayment * 100), // Convert to paise (1 INR = 100 paise)
      currency: 'INR',
      receipt: newBooking.id,
      notes: {
        bookingId: newBooking.id,
        vehicleId: vehicleId,
        pickupDate: pickupDate, // Keep IST date in notes for reference
        dropoffDate: dropoffDate,
        customerName: customerDetails.name,
        customerEmail: customerDetails.email,
        customerPhone: customerDetails.phone
      }
    });

        return NextResponse.json({
          success: true,
          data: {
        bookingId: newBooking.id,
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