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
          COALESCE(b.pickup_location, 
            CASE 
              WHEN jsonb_typeof(b.location::jsonb) = 'array' THEN b.location::jsonb->0
              WHEN jsonb_typeof(b.location::jsonb) = 'string' THEN b.location::jsonb
              ELSE NULL
            END
          ) as effective_location,
          v.name as vehicle_name,
          v.quantity as vehicle_quantity,
          COUNT(*) OVER (
            PARTITION BY COALESCE(b.pickup_location, 
              CASE 
                WHEN jsonb_typeof(b.location::jsonb) = 'array' THEN b.location::jsonb->0
                WHEN jsonb_typeof(b.location::jsonb) = 'string' THEN b.location::jsonb
                ELSE NULL
              END
            )
          ) as concurrent_bookings
        FROM bookings b
        JOIN vehicles v ON b.vehicle_id = v.id
        WHERE b.vehicle_id = $1
        AND b.status NOT IN ('cancelled', 'failed')
        AND b.payment_status != 'failed'
        AND (
          (b.start_date - interval '30 minutes', b.end_date + interval '30 minutes') OVERLAPS ($2::timestamp, $3::timestamp)
          OR (
            b.start_date - interval '30 minutes' <= $3::timestamp 
            AND b.end_date + interval '30 minutes' >= $2::timestamp
          )
        )
      )
      SELECT * FROM booking_counts
      WHERE concurrent_bookings >= vehicle_quantity
    `, [vehicleId, pickupDateTime.toISOString(), dropoffDateTime.toISOString()]);

    logger.info('Raw booking query results:', {
      vehicleId,
      rowCount: bookingsResult.rowCount,
      rows: bookingsResult.rows.map(row => ({
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
    
    bookingsResult.rows.forEach(row => {
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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const pickupDate = searchParams.get('pickupDate');
    const pickupTime = searchParams.get('pickupTime');
    const dropoffDate = searchParams.get('dropoffDate');
    const dropoffTime = searchParams.get('dropoffTime');

    if (!pickupDate || !pickupTime || !dropoffDate || !dropoffTime) {
      return NextResponse.json({ error: 'Missing date/time parameters' }, { status: 400 });
    }

    // Combine date and time into timestamps
    const startTime = `${pickupDate} ${pickupTime}`;
    const endTime = `${dropoffDate} ${dropoffTime}`;

    // Get vehicles with their available locations
    const result = await query(`
      WITH booked_locations AS (
        SELECT DISTINCT
          b.vehicle_id,
          b.pickup_location
        FROM bookings b
        WHERE b.status NOT IN ('cancelled', 'failed')
        AND b.payment_status != 'failed'
        AND (
          ($2::timestamp, $3::timestamp) OVERLAPS (b.start_date, b.end_date)
          OR b.start_date BETWEEN $2::timestamp AND $3::timestamp
          OR b.end_date BETWEEN $2::timestamp AND $3::timestamp
          OR ($2::timestamp BETWEEN b.start_date AND b.end_date)
          OR ($3::timestamp BETWEEN b.start_date AND b.end_date)
        )
      )
      SELECT 
        v.id,
        v.name,
        v.type,
        v.status,
        v.price_per_hour,
        v.min_booking_hours,
        v.quantity,
        v.images,
        v.is_available,
        v.created_at,
        v.updated_at,
        (
          SELECT jsonb_agg(loc)
          FROM jsonb_array_elements_text(v.location::jsonb) loc
          WHERE NOT EXISTS (
            SELECT 1 
            FROM booked_locations bl 
            WHERE bl.vehicle_id = v.id 
            AND bl.pickup_location = loc::text
          )
        ) as available_locations
      FROM vehicles v
      WHERE ($1::text IS NULL OR v.type = $1)
      AND v.status = 'active'
      AND v.is_available = true
    `, [type, startTime, endTime]);

    // Process vehicles
    const vehicles = result.rows
      .map(vehicle => {
        const availableLocations = vehicle.available_locations || [];
        
        // Log for debugging
        logger.info('Processing vehicle locations:', {
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          allLocations: vehicle.location,
          availableLocations,
          hasAvailableLocations: availableLocations.length > 0
        });
        
        // Skip vehicles with no available locations
        if (availableLocations.length === 0) {
          return null;
        }

        return {
          ...vehicle,
          location: availableLocations,
          available: true,
          images: JSON.parse(vehicle.images || '[]')
        };
      })
      .filter(Boolean); // Remove null vehicles

    logger.info('Filtered vehicles:', {
      totalVehicles: result.rows.length,
      availableVehicles: vehicles.length,
      requestedTimeRange: {
        start: startTime,
        end: endTime
      }
    });

    return NextResponse.json({ vehicles });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
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