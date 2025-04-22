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

// Add interface for booking row
interface BookingRow {
  id: string;
  start_date: Date;
  end_date: Date;
  effective_location: string;
  status: string;
  vehicle_quantity: number;
  concurrent_bookings: number;
}

// Helper function to get available locations for a vehicle
async function getAvailableLocations(
  vehicleId: string,
  locations: string[],
  pickupDateTime: Date | null,
  dropoffDateTime: Date | null
) {
  if (!pickupDateTime || !dropoffDateTime) {
    return locations;
  }

  try {
    logger.info('Starting location availability check:', {
      vehicleId,
      locations,
      pickupDateTime: pickupDateTime.toISOString(),
      dropoffDateTime: dropoffDateTime.toISOString()
    });

    // Check bookings for each location
    const bookingsResult = await query(`
      WITH booking_counts AS (
        SELECT 
          b.id,
          b.start_date,
          b.end_date,
          b.status,
          b.pickup_location::text as effective_location,
          v.name as vehicle_name,
          v.quantity as vehicle_quantity,
          COUNT(*) OVER (
            PARTITION BY b.pickup_location::text
          ) as concurrent_bookings
        FROM bookings b
        JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.vehicle_id = $1
        AND b.status NOT IN ('cancelled', 'failed')
        AND b.payment_status != 'failed'
        AND (
          (b.start_date - interval '2 hours', b.end_date + interval '2 hours') OVERLAPS ($2::timestamp, $3::timestamp)
          OR ($2::timestamp BETWEEN (b.start_date - interval '2 hours') AND (b.end_date + interval '2 hours'))
          OR ($3::timestamp BETWEEN (b.start_date - interval '2 hours') AND (b.end_date + interval '2 hours'))
          OR (b.start_date - interval '2 hours') BETWEEN $2::timestamp AND $3::timestamp
          OR (b.end_date + interval '2 hours') BETWEEN $2::timestamp AND $3::timestamp
        )
      )
      SELECT * FROM booking_counts
      WHERE concurrent_bookings >= vehicle_quantity
    `, [vehicleId, pickupDateTime.toISOString(), dropoffDateTime.toISOString()]);

    logger.info('Raw booking query results:', {
      vehicleId,
      rowCount: bookingsResult.rowCount,
      rows: bookingsResult.rows.map((row: BookingRow) => ({
        id: row.id,
        start_date: row.start_date,
        end_date: row.end_date,
        effective_location: row.effective_location,
        status: row.status,
        vehicle_quantity: row.vehicle_quantity,
        concurrent_bookings: row.concurrent_bookings
      }))
    });

    // Create a set of unavailable locations
    const unavailableLocations = new Set<string>();
    
    bookingsResult.rows.forEach((row: BookingRow) => {
      try {
        const locationValue = row.effective_location;
        if (locationValue) {
          logger.info('Location unavailable due to concurrent bookings:', {
            location: locationValue,
            concurrent_bookings: row.concurrent_bookings,
            vehicle_quantity: row.vehicle_quantity,
            bookingId: row.id,
            timeRange: `${row.start_date} to ${row.end_date}`
          });
          unavailableLocations.add(locationValue);
        }
      } catch (error) {
        logger.error('Error processing location:', {
          error,
          bookingId: row.id,
          effective_location: row.effective_location,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Filter available locations
    const availableLocations = locations.filter(loc => !unavailableLocations.has(loc));

    logger.info('Final availability check results:', {
      vehicleId,
      allLocations: locations,
      unavailableLocations: Array.from(unavailableLocations),
      availableLocations,
      requestedTimeRange: {
        start: pickupDateTime,
        end: dropoffDateTime
      }
    });

    return availableLocations;
  } catch (error) {
    logger.error('Error in getAvailableLocations:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      vehicleId,
      locations
    });
    // Return all locations as fallback in case of error
    return locations;
  }
}

interface VehicleRow {
  id: string;
  name: string;
  type: string;
  status: string;
  price_per_hour: number;
  price_7_days: number | null;
  price_15_days: number | null;
  price_30_days: number | null;
  location: string;  // PostgreSQL returns this as a string
  images: string;    // PostgreSQL returns this as a string
  quantity: number;
  min_booking_hours: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  booked_locations: string[];
}

// GET /api/vehicles - List all vehicles
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const location = url.searchParams.get('location');
    const pickupDate = url.searchParams.get('pickupDate');
    const dropoffDate = url.searchParams.get('dropoffDate');

    // Base query with sorting logic
    const baseQuery = `
      SELECT 
        v.id,
        v.name,
        v.type,
        v.status,
        v.price_per_hour,
        v.price_7_days,
        v.price_15_days,
        v.price_30_days,
        v.location,
        v.images,
        v.quantity,
        v.min_booking_hours,
        v.is_available,
        v.created_at,
        v.updated_at,
        COALESCE(
          array_agg(DISTINCT b.pickup_location) FILTER (WHERE b.pickup_location IS NOT NULL),
          '{}'
        ) as booked_locations
      FROM vehicles v
      LEFT JOIN bookings b ON v.id = b.vehicle_id 
        AND b.status NOT IN ('cancelled', 'failed')
        AND b.payment_status != 'failed'
      WHERE v.status = 'active'
      GROUP BY v.id
      ORDER BY 
        -- First, prioritize Activa bikes
        CASE WHEN LOWER(v.name) LIKE '%activa%' THEN 0 ELSE 1 END,
        -- Then sort by price
        v.price_per_hour ASC,
        -- Finally sort by name for consistent ordering
        v.name ASC
    `;

    const result = await query(baseQuery, []);

    // Process vehicles
    const processedVehicles = result.rows
      .map((vehicle: VehicleRow) => {
        try {
          // Parse location and images from JSON strings
          const locationArray = Array.isArray(vehicle.location) 
            ? vehicle.location 
            : JSON.parse(vehicle.location || '[]');
          
          const imagesArray = Array.isArray(vehicle.images)
            ? vehicle.images
            : JSON.parse(vehicle.images || '[]');

          return {
            ...vehicle,
            location: locationArray,
            images: imagesArray,
            booked_locations: vehicle.booked_locations || []
          };
        } catch (error) {
          logger.error('Error processing vehicle:', {
            vehicleId: vehicle.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return null;
        }
      })
      .filter((v: VehicleRow | null): v is VehicleRow => v !== null);

    logger.info('Filtered vehicles:', {
      totalVehicles: result.rows.length,
      availableVehicles: processedVehicles.length,
      requestedTimeRange: {
        start: pickupDate,
        end: dropoffDate
      }
    });

    return NextResponse.json({ vehicles: processedVehicles });
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json({ error: 'Failed to fetch vehicles', vehicles: [] }, { status: 500 });
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