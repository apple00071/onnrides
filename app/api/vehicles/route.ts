import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { 
  VehicleResponse, 
  CreateVehicleBody,
  PricingPlan,
  VehiclePricing,
  BookingDetails,
  ApiResponse 
} from '@/lib/types';

// Define status enum directly since we removed schema import
const VEHICLE_STATUS = {
  AVAILABLE: 'available',
  MAINTENANCE: 'maintenance',
  RESERVED: 'reserved',
  RENTED: 'rented'
} as const;

// Helper function to check if a date is a weekend
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
}

// Helper function to calculate price based on duration and weekday/weekend
function calculatePrice(pricePerHour: number, startDate: Date, endDate: Date): {
  totalHours: number,
  chargeableHours: number,
  totalPrice: number
} {
  const diffMs = endDate.getTime() - startDate.getTime();
  // Round to nearest hour by dividing by hour in milliseconds
  const totalHours = Math.round(diffMs / (1000 * 60 * 60));
  
  // Check if any part of the booking is on a weekend
  let weekendHours = 0;
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (isWeekend(currentDate)) {
      weekendHours += 24; // Add 24 hours for each weekend day
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Minimum booking is 12 hours
  const chargeableHours = Math.max(totalHours, 12);
  
  // Weekend pricing: 20% more expensive
  const weekdayHours = chargeableHours - weekendHours;
  const weekdayPrice = pricePerHour * weekdayHours;
  const weekendPrice = pricePerHour * weekendHours * 1.2;
  const totalPrice = weekdayPrice + weekendPrice;

  return {
    totalHours,
    chargeableHours,
    totalPrice
  };
}

// Helper function to get next available time slot
async function getNextAvailableSlot(vehicleId: string, location: string) {
  const result = await query(`
    SELECT 
      pickup_datetime, 
      dropoff_datetime
    FROM bookings
    WHERE vehicle_id = $1
    AND status NOT IN ('cancelled')
    AND location::jsonb ? $2
    AND dropoff_datetime > NOW()
    ORDER BY dropoff_datetime ASC
  `, [vehicleId, location]);

  if (result.rows.length === 0) {
    return null; // No bookings, available now
  }

  // Find the first gap between bookings that's at least 1 hour
  let lastEndTime = new Date();
  for (const booking of result.rows) {
    const startTime = new Date(booking.pickup_datetime);
    if (startTime.getTime() - lastEndTime.getTime() > 3600000) { // 1 hour in milliseconds
      return {
        nextAvailable: lastEndTime,
        until: startTime
      };
    }
    lastEndTime = new Date(booking.dropoff_datetime);
  }

  // If no gaps found, return the time after the last booking
  return {
    nextAvailable: lastEndTime,
    until: null
  };
}

// GET /api/vehicles - List all vehicles
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const requestedLocation = searchParams.get('location');
    const pickupDate = searchParams.get('pickupDate');
    const pickupTime = searchParams.get('pickupTime');
    const dropoffDate = searchParams.get('dropoffDate');
    const dropoffTime = searchParams.get('dropoffTime');
    const minPrice = Number(searchParams.get('minPrice')) || 0;
    const maxPrice = Number(searchParams.get('maxPrice')) || Number.MAX_SAFE_INTEGER;

    logger.info('Search params:', { 
      type, 
      requestedLocation, 
      pickupDate, 
      pickupTime, 
      dropoffDate, 
      dropoffTime, 
      minPrice, 
      maxPrice 
    });

    // Validate date and time parameters if provided
    let pickupDateTime: Date | null = null;
    let dropoffDateTime: Date | null = null;

    if (pickupDate && pickupTime) {
      try {
        const tempDate = new Date(`${pickupDate}T${pickupTime}`);
        if (isNaN(tempDate.getTime())) {
          throw new Error('Invalid pickup date/time');
        }
        pickupDateTime = tempDate;
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid pickup date/time format' },
          { status: 400 }
        );
      }
    }

    if (dropoffDate && dropoffTime) {
      try {
        const tempDate = new Date(`${dropoffDate}T${dropoffTime}`);
        if (isNaN(tempDate.getTime())) {
          throw new Error('Invalid dropoff date/time');
        }
        dropoffDateTime = tempDate;
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid dropoff date/time format' },
          { status: 400 }
        );
      }
    }

    // Get all vehicles first
    const result = await query(`
      SELECT 
        v.id,
        v.name,
        v.type,
        v.status,
        CAST(v.price_per_hour AS DECIMAL) as price_per_hour,
        v.location,
        v.images,
        v.quantity,
        v.min_booking_hours,
        v.is_available,
        v.created_at,
        v.updated_at
      FROM vehicles v
      WHERE ($1::text IS NULL OR v.type = $1)
      AND v.price_per_hour >= $2
      AND v.price_per_hour <= $3
      AND v.status = 'active'
      AND v.is_available = true
    `, [type, minPrice, maxPrice]);

    // Process each vehicle and check location availability
    const processedVehicles = await Promise.all(result.rows.map(async (vehicle) => {
      let locations: string[] = [];
      try {
        locations = typeof vehicle.location === 'string' 
          ? JSON.parse(vehicle.location) 
          : Array.isArray(vehicle.location) 
            ? vehicle.location 
            : [vehicle.location];
      } catch (e) {
        locations = vehicle.location ? [vehicle.location] : [];
      }

      // If a specific location is requested, check availability
      if (requestedLocation) {
        if (!locations.includes(requestedLocation)) {
          return null; // Skip vehicles not available at requested location
        }

        try {
          // Check current bookings at this location
          const bookingsResult = await query(`
            SELECT COUNT(*) as booking_count
            FROM bookings
            WHERE vehicle_id = $1
            AND status NOT IN ('cancelled')
            AND location::jsonb @> $2::jsonb
            AND ($3::timestamp IS NULL OR $4::timestamp IS NULL OR
              (pickup_datetime, dropoff_datetime) OVERLAPS ($3::timestamp, $4::timestamp)
            )
          `, [
            vehicle.id, 
            JSON.stringify([requestedLocation]),
            pickupDateTime?.toISOString() || null,
            dropoffDateTime?.toISOString() || null
          ]);

          const existingBookings = parseInt(bookingsResult.rows[0].booking_count);
          const quantityPerLocation = Math.ceil(vehicle.quantity / locations.length);

          if (existingBookings >= quantityPerLocation) {
            // Get next available time slot
            const nextSlot = await getNextAvailableSlot(vehicle.id, requestedLocation);
            return {
              ...vehicle,
              location: [requestedLocation],
              available: false,
              nextAvailable: nextSlot,
              images: typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images
            };
          }
        } catch (error) {
          logger.error('Error checking bookings:', error);
          throw new Error(`Failed to check bookings: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // For non-location-specific requests or available vehicles
      return {
        ...vehicle,
        location: locations,
        available: true,
        images: typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images
      };
    }));

    // Filter out null values and sort: available vehicles first, then unavailable with next slots
    const vehicles = processedVehicles
      .filter(Boolean)
      .sort((a, b) => {
        if (a.available === b.available) return 0;
        return a.available ? -1 : 1;
      });

    return NextResponse.json({ vehicles });
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch vehicles',
        details: error instanceof Error ? error.message : 'Unknown error',
        vehicles: []
      },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Create vehicle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      type,
      location,
      price_per_hour,
      description,
      features,
      images,
      status = 'active',
    } = body as CreateVehicleBody;

    // Validate required fields
    if (!name || !type || !price_per_hour) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure arrays are properly formatted for PostgreSQL
    const locationJson = Array.isArray(location) 
      ? JSON.stringify(location)
      : JSON.stringify([location]);

    const featuresArray = Array.isArray(features) ? features : [];
    const imagesArray = Array.isArray(images) ? images : [];

    const result = await query(
      `INSERT INTO vehicles (
        name, type, location, price_per_hour, description, 
        features, images, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
      RETURNING *`,
      [
        name,
        type,
        locationJson,
        price_per_hour,
        description || null,
        featuresArray,
        imagesArray,
        status
      ]
    );

    const vehicle = result.rows[0];

    return NextResponse.json({
      message: 'Vehicle created successfully',
      vehicle: {
        ...vehicle,
        location: JSON.parse(vehicle.location),
        images: vehicle.images || [],
        features: vehicle.features || []
      }
    });
  } catch (error) {
    logger.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
} 