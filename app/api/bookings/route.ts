import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { nanoid } from 'nanoid';
import { Booking, ApiResponse } from '@/lib/types';

const isDevelopment = process.env.NODE_ENV === 'development';

type BookingBody = {
  vehicle_id: string;
  pickup_datetime: string;
  dropoff_datetime: string;
  total_hours: number;
  total_price: number;
  location?: string;
};

// GET /api/bookings - List user's bookings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
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
        COALESCE(b.booking_id, 'OR' || SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 3)) as booking_id
      FROM bookings b
      LEFT JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.user_id = $1 
      ORDER BY b.created_at DESC
    `, [session.user.id]);
    
    // Log raw data for debugging
    if (result.rows.length > 0) {
      logger.info('First booking raw data:', {
        firstBooking: JSON.stringify(result.rows[0], null, 2)
      });
    }
    
    const bookings = result.rows.map(booking => {
      // Parse dates properly
      const startDate = new Date(booking.start_date);
      const endDate = new Date(booking.end_date);
      
      return {
        id: booking.id,
        booking_id: booking.booking_id,
        status: booking.status,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        total_price: parseFloat(booking.total_price),
        payment_status: booking.payment_status,
        created_at: new Date(booking.created_at).toISOString(),
        updated_at: new Date(booking.updated_at).toISOString(),
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
    logger.error('Error fetching bookings:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to fetch bookings' 
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const data = await request.json();
    
    // First, get vehicle details including quantity and locations
    const vehicleResult = await query(`
      SELECT quantity, name, location FROM vehicles WHERE id = $1
    `, [data.vehicle_id]);

    if (vehicleResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const vehicle = vehicleResult.rows[0];
    const vehicleQuantity = vehicle.quantity || 1;
    
    // Parse vehicle locations
    let vehicleLocations;
    try {
      vehicleLocations = typeof vehicle.location === 'string' 
        ? JSON.parse(vehicle.location) 
        : vehicle.location;
    } catch (e) {
      vehicleLocations = [vehicle.location];
    }

    // Validate requested location is available for this vehicle
    if (!data.location || !vehicleLocations.includes(data.location)) {
      return NextResponse.json(
        { error: `${vehicle.name} is not available at the selected location` },
        { status: 400 }
      );
    }

    // Check for overlapping bookings at the same location
    const overlapResult = await query(`
      SELECT COUNT(*) as booking_count
      FROM bookings
      WHERE vehicle_id = $1
      AND status NOT IN ('cancelled')
      AND location::jsonb ? $4
      AND (
        (pickup_datetime, dropoff_datetime) OVERLAPS ($2::timestamp, $3::timestamp)
        OR
        (start_date, end_date) OVERLAPS ($2::timestamp, $3::timestamp)
      )
    `, [data.vehicle_id, data.pickup_datetime, data.dropoff_datetime, data.location]);

    const existingBookings = parseInt(overlapResult.rows[0].booking_count);

    // Calculate per-location quantity (evenly distributed)
    const locationsCount = vehicleLocations.length;
    const quantityPerLocation = Math.ceil(vehicleQuantity / locationsCount);

    if (existingBookings >= quantityPerLocation) {
      return NextResponse.json(
        { 
          error: `${vehicle.name} is already fully booked at ${data.location} for the selected time period`,
          availableQuantity: quantityPerLocation,
          existingBookings: existingBookings,
          location: data.location
        },
        { status: 409 }
      );
    }

    // Clean up location data for storage
    const locationForStorage = JSON.stringify([data.location]);

    // Generate unique booking ID
    const bookingId = generateBookingId();

    const result = await query(`
      INSERT INTO bookings (
        booking_id,
        user_id,
        vehicle_id,
        pickup_datetime,
        dropoff_datetime,
        total_hours,
        total_price,
        location,
        status,
        payment_status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `, [
      bookingId,
      session.user.id,
      data.vehicle_id,
      data.pickup_datetime,
      data.dropoff_datetime,
      data.total_hours,
      data.total_price,
      locationForStorage,
      'confirmed',
      'pending'
    ]);

    const booking = result.rows[0];

    return NextResponse.json({
      success: true,
      booking: {
        ...booking,
        booking_id: bookingId,
        location: [data.location]
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