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
  customerDetails: {
    name: string;
    email: string;
    phone: string;
  };
  totalPrice: number;
  location?: string;
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

// Helper function to generate unique booking ID
function generateBookingId(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'OR';
  for (let i = 0; i < 3; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// POST /api/bookings - Create booking
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // First, ensure the payment_intent_id column exists
    try {
      await query(`
        DO $$ 
        BEGIN
          BEGIN
            ALTER TABLE bookings ADD COLUMN payment_intent_id TEXT;
          EXCEPTION
            WHEN duplicate_column THEN 
              -- Column already exists, do nothing
          END;
        END $$;
      `);
      
      // Create index if it doesn't exist
      await query(`
        CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent_id 
        ON bookings(payment_intent_id);
      `);
    } catch (alterError) {
      logger.error('Error ensuring payment_intent_id column exists:', alterError);
      // Continue anyway, as the column might already exist
    }

    // Log request method and URL
    logger.info('Received booking request:', {
      method: request.method,
      url: request.url
    });

    // Check if Razorpay is initialized
    if (!razorpay) {
      const error = new Error('Razorpay not initialized');
      logger.error('Payment service unavailable:', {
        error,
        keyIdExists: !!RAZORPAY_KEY_ID,
        keySecretExists: !!RAZORPAY_KEY_SECRET,
        razorpayInstance: !!razorpay
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Payment service unavailable',
          details: RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET 
            ? 'Failed to initialize payment service'
            : 'Payment service credentials are missing'
        },
        { status: 503 }
      );
    }

    // Get user session
    const session = await getServerSession(authOptions);
    logger.info('Session check:', {
      hasSession: !!session,
      user: session?.user ? {
        id: session.user.id,
        email: session.user.email
      } : null
    });

    if (!session?.user?.id) {
      logger.error('Authentication failed:', { 
        session,
        user: session?.user,
        userId: session?.user?.id
      });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Authentication required',
          details: 'User session not found or invalid'
        },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let data: CreateBookingBody;
    try {
      const rawBody = await request.text();
      logger.info('Raw request body:', { body: rawBody });
      data = JSON.parse(rawBody) as CreateBookingBody;
    } catch (e) {
      logger.error('Failed to parse request body:', e);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid request body',
          details: e instanceof Error ? e.message : 'Failed to parse JSON'
        },
        { status: 400 }
      );
    }

    logger.info('Parsed request data:', {
      vehicleId: data.vehicleId,
      pickupDate: data.pickupDate,
      dropoffDate: data.dropoffDate,
      totalPrice: data.totalPrice,
      customerDetails: data.customerDetails,
      location: data.location
    });
    
    // Validate required fields
    if (!data.vehicleId || !data.pickupDate || !data.dropoffDate || !data.totalPrice) {
      const missingFields = {
        vehicleId: !data.vehicleId,
        pickupDate: !data.pickupDate,
        dropoffDate: !data.dropoffDate,
        totalPrice: !data.totalPrice
      };
      logger.error('Missing required fields:', missingFields);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields',
          details: missingFields
        },
        { status: 400 }
      );
    }

    // Validate dates
    const pickupDate = new Date(data.pickupDate);
    const dropoffDate = new Date(data.dropoffDate);

    logger.info('Validating dates:', {
      pickupDate: {
        raw: data.pickupDate,
        parsed: pickupDate,
        timestamp: pickupDate.getTime()
      },
      dropoffDate: {
        raw: data.dropoffDate,
        parsed: dropoffDate,
        timestamp: dropoffDate.getTime()
      }
    });

    if (isNaN(pickupDate.getTime()) || isNaN(dropoffDate.getTime())) {
      logger.error('Invalid dates:', {
        pickupDate: data.pickupDate,
        dropoffDate: data.dropoffDate,
        pickupValid: !isNaN(pickupDate.getTime()),
        dropoffValid: !isNaN(dropoffDate.getTime())
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid dates',
          details: 'Pickup or dropoff date is invalid'
        },
        { status: 400 }
      );
    }

    // Compare full timestamps to ensure dropoff is after pickup
    if (dropoffDate.getTime() <= pickupDate.getTime()) {
      logger.error('Invalid date range:', {
        pickupDate: pickupDate.toISOString(),
        dropoffDate: dropoffDate.toISOString(),
        comparison: {
          asTimestamp: dropoffDate.getTime() <= pickupDate.getTime(),
          pickupTime: pickupDate.toLocaleTimeString(),
          dropoffTime: dropoffDate.toLocaleTimeString()
        }
      });
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid date range',
          details: `Dropoff time (${dropoffDate.toLocaleString()}) must be after pickup time (${pickupDate.toLocaleString()})`
        },
        { status: 400 }
      );
    }

    // Check for overlapping bookings
    logger.info('Checking for overlapping bookings:', {
      vehicleId: data.vehicleId,
      requestedPickup: pickupDate.toISOString(),
      requestedDropoff: dropoffDate.toISOString()
    });

    const overlapCheckResult = await query(`
      WITH booking_counts AS (
        SELECT 
          COUNT(*) as concurrent_bookings,
          v.quantity
        FROM bookings b
        JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.vehicle_id = $1 
          AND b.pickup_location = $2
          AND b.status NOT IN ('cancelled', 'failed')
          AND b.payment_status != 'failed'
          AND (
            ($3::timestamp BETWEEN b.start_date AND b.end_date)
            OR ($4::timestamp BETWEEN b.start_date AND b.end_date)
            OR (b.start_date BETWEEN $3::timestamp AND $4::timestamp)
            OR (b.end_date BETWEEN $3::timestamp AND $4::timestamp)
          )
        GROUP BY v.quantity
      )
      SELECT * FROM booking_counts
      WHERE concurrent_bookings >= quantity
    `, [data.vehicleId, data.location, pickupDate.toISOString(), dropoffDate.toISOString()]);

    if (overlapCheckResult.rowCount > 0) {
      logger.error('Overlapping booking found:', {
        vehicleId: data.vehicleId,
        location: data.location,
        requestedPickup: pickupDate,
        requestedDropoff: dropoffDate,
        concurrent_bookings: overlapCheckResult.rows[0].concurrent_bookings,
        vehicle_quantity: overlapCheckResult.rows[0].quantity
      });
      return NextResponse.json(
        {
          success: false,
          error: 'Vehicle unavailable',
          details: 'This vehicle is already fully booked at this location for the selected time period'
        },
        { status: 409 }
      );
    }

    // Generate UUID for booking
    const bookingId = randomUUID();
    logger.info('Generated booking ID:', { bookingId });

    // Calculate duration in hours
    const durationInHours = Math.ceil((dropoffDate.getTime() - pickupDate.getTime()) / (1000 * 60 * 60));
    logger.info('Calculated duration:', { durationInHours });

    // Create Razorpay order
    try {
      // Ensure amount is a valid number and at least 1 rupee (100 paise)
      const amountInRupees = parseFloat(data.totalPrice.toFixed(2));
      const amountInPaise = Math.max(Math.round(amountInRupees * 100), 100);
      
      if (isNaN(amountInPaise) || amountInPaise <= 0) {
        throw new Error(`Invalid amount: ${amountInRupees} rupees (${amountInPaise} paise)`);
      }

      logger.info('Processing payment amount:', {
        originalAmount: data.totalPrice,
        amountInRupees,
        amountInPaise,
        formattedAmount: new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR'
        }).format(amountInRupees)
      });

      const orderOptions = {
        amount: amountInPaise,
        currency: "INR",
        receipt: `OR${bookingId.substring(0, 8)}`,
        notes: {
          booking_id: bookingId,
          user_id: session.user.id,
          vehicle_id: data.vehicleId,
          pickup_date: data.pickupDate,
          dropoff_date: data.dropoffDate,
          amount_in_rupees: amountInRupees
        },
        payment_capture: 1 // Auto capture payment when successful
      };

      logger.info('Creating Razorpay order with options:', {
        ...orderOptions,
        key_id: RAZORPAY_KEY_ID?.substring(0, 6) + '...',
        key_secret_exists: !!RAZORPAY_KEY_SECRET,
        razorpay_initialized: !!razorpay,
        orders_api_exists: !!razorpay?.orders
      });

      // Create the order using direct API call instead of SDK
      let order;
      try {
        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64'),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(orderOptions)
        });

        const responseText = await response.text();
        logger.info('Razorpay API response:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseText
        });

        if (!response.ok) {
          throw new Error(`Razorpay API error: ${response.status} ${response.statusText} - ${responseText}`);
        }

        try {
          order = JSON.parse(responseText);
        } catch (parseError) {
          logger.error('Failed to parse Razorpay response:', {
            error: parseError,
            responseText
          });
          throw new Error('Invalid JSON response from Razorpay');
        }

        if (!order || !order.id) {
          logger.error('Invalid order response:', { order });
          throw new Error('Invalid order response from Razorpay');
        }

        logger.info('Razorpay order created successfully:', {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          receipt: order.receipt,
          status: order.status
        });
      } catch (orderError: any) {
        logger.error('Failed to create Razorpay order:', {
          error: orderError,
          message: orderError.message,
          stack: orderError.stack,
          orderOptions: {
            ...orderOptions,
            key_id: RAZORPAY_KEY_ID?.substring(0, 6) + '...'
          }
        });
        throw new Error(`Failed to create Razorpay order: ${orderError.message}`);
      }
      
      // Create the booking in database
      let bookingResult;
      try {
        // First, let's check the actual table structure
        const tableInfo = await query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = 'bookings' 
          ORDER BY ordinal_position;
        `);
        
        logger.info('Bookings table structure:', {
          columns: tableInfo.rows
        });

        bookingResult = await query(`
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
            payment_intent_id,
        pickup_location,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `, [
      bookingId,
      session.user.id,
          data.vehicleId,
          pickupDate.toISOString(),
          dropoffDate.toISOString(),
          durationInHours,
          amountInRupees,
          'pending',
          'pending',
          order.id,  // Store the Razorpay order ID
          data.location, // Add pickup location
        ]);
      } catch (dbError) {
        logger.error('Database error creating booking:', {
          error: dbError,
          message: dbError instanceof Error ? dbError.message : 'Unknown database error',
          query: {
            bookingId,
            userId: session.user.id,
            vehicleId: data.vehicleId,
            startTime: pickupDate.toISOString(),
            endTime: dropoffDate.toISOString(),
            totalHours: durationInHours,
            totalAmount: amountInRupees,
            orderId: order.id
          }
        });
        throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : 'Failed to create booking record'}`);
      }

      const booking = bookingResult.rows[0];
      logger.info('Successfully created booking:', booking);

    return NextResponse.json({
      success: true,
        bookingId: booking.id,
        data: {
        ...booking,
          totalPrice: booking.total_price,
          totalHours: booking.total_hours,
          pickupDate: booking.start_date,
          dropoffDate: booking.end_date,
          key: RAZORPAY_KEY_ID,
          orderId: order.id,
          paymentIntentId: booking.payment_intent_id,
          amount: order.amount,
          currency: order.currency,
          bookingId: booking.id
        }
      });
    } catch (error) {
      logger.error('Error in booking creation:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create booking',
          details: error instanceof Error ? error.message : 'Unknown error occurred',
          errorType: error instanceof Error ? error.name : 'Unknown',
          timestamp: new Date().toISOString()
        },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Error creating booking:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
      cause: error instanceof Error ? error.cause : undefined
    });

    // Check for Razorpay specific errors
    if (error instanceof Error && error.message.includes('Razorpay')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to create payment order',
          details: error.message
        },
        { status: 500 }
      );
    }

    // Check for specific database errors
    if (error instanceof Error) {
      if (error.message.includes('violates foreign key constraint')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid reference',
            details: 'The vehicle ID or user ID is invalid'
          },
          { status: 400 }
        );
      }
      if (error.message.includes('duplicate key')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Duplicate booking',
            details: 'A booking with this ID already exists'
          },
          { status: 409 }
        );
      }
      if (error.message.includes('invalid input syntax')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid input',
            details: 'One or more fields have invalid values'
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create booking',
        details: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
} 