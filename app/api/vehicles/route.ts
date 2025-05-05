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
  pickupDateStr: string | null,
  dropoffDateStr: string | null
) {
  // Convert string dates to Date objects if they exist
  const pickupDateTime = pickupDateStr ? new Date(pickupDateStr) : null;
  const dropoffDateTime = dropoffDateStr ? new Date(dropoffDateStr) : null;

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
    // Extract query parameters
    const url = new URL(request.url);
    const pickupDateStr = url.searchParams.get('pickupDate');
    const dropoffDateStr = url.searchParams.get('dropoffDate');
    const vehicleId = url.searchParams.get('id');
    const location = url.searchParams.get('location');

    // If there's a vehicle ID, fetch a single vehicle
    if (vehicleId) {
      try {
        const vehicleQuery = `
          SELECT 
            id, 
            name, 
            type, 
            location, 
            quantity,
            price_per_hour,
            price_7_days, 
            price_15_days, 
            price_30_days,
            min_booking_hours,
            images, 
            status, 
            is_available,
            created_at,
            updated_at
          FROM vehicles
          WHERE id = $1
        `;
        
        const result = await query(vehicleQuery, [vehicleId]);
        
        if (result.rows.length === 0) {
          return NextResponse.json(
            { error: 'Vehicle not found' },
            { status: 404 }
          );
        }
        
        const vehicle = result.rows[0];
        
        // Make sure we're capturing both camelCase and snake_case versions of price
        const pricePerHour = Number(vehicle.price_per_hour || 0);
        const minBookingHours = Number(vehicle.min_booking_hours || 1);
        
        // Parse locations - ensuring it's an array
        let locations = [];
        try {
          locations = Array.isArray(vehicle.location)
            ? vehicle.location
            : typeof vehicle.location === 'string'
              ? JSON.parse(vehicle.location)
              : [];
        } catch (e) {
          locations = typeof vehicle.location === 'string' ? [vehicle.location] : [];
        }
        
        // Parse images - ensuring it's an array
        let images = [];
        try {
          images = Array.isArray(vehicle.images)
            ? vehicle.images
            : typeof vehicle.images === 'string'
              ? JSON.parse(vehicle.images)
            : [];
        } catch (e) {
          images = [];
        }
        
        // Format the response
        const formattedVehicle = {
          id: vehicle.id,
          name: vehicle.name,
          type: vehicle.type,
          price_per_hour: pricePerHour,
          pricePerHour: pricePerHour,
          min_booking_hours: minBookingHours,
          minBookingHours: minBookingHours,
          price_7_days: vehicle.price_7_days,
          price_15_days: vehicle.price_15_days,
          price_30_days: vehicle.price_30_days,
          location: locations,
          images: images,
          status: vehicle.status,
          is_available: vehicle.is_available || false,
          isAvailable: vehicle.is_available || false,
          created_at: vehicle.created_at,
          updated_at: vehicle.updated_at
        };
        
        return NextResponse.json(formattedVehicle);
      } catch (error) {
        logger.error('Error fetching vehicle details:', error);
        return NextResponse.json(
          { error: 'Failed to fetch vehicle details' },
          { status: 500 }
        );
      }
    }

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
          // Handle location - could be string, array, or JSON string
          let locationArray: string[];
          if (typeof vehicle.location === 'string') {
            // If it's a comma-separated string, split it
            if (vehicle.location.includes(',')) {
              locationArray = vehicle.location.split(',').map(loc => loc.trim());
            } else {
              // Single location
              locationArray = [vehicle.location];
            }
          } else if (Array.isArray(vehicle.location)) {
            locationArray = vehicle.location;
          } else {
            try {
              // Try parsing as JSON, fallback to empty array
              locationArray = JSON.parse(vehicle.location || '[]');
            } catch {
              locationArray = [];
            }
          }

          // Handle images - could be string, array, or JSON string
          let imagesArray: string[];
          if (typeof vehicle.images === 'string') {
            try {
              imagesArray = JSON.parse(vehicle.images);
            } catch {
              // If not valid JSON, treat as comma-separated string
              imagesArray = vehicle.images.split(',').map(img => img.trim());
            }
          } else if (Array.isArray(vehicle.images)) {
            imagesArray = vehicle.images;
          } else {
            imagesArray = [];
          }

          return {
            ...vehicle,
            location: locationArray,
            images: imagesArray,
            booked_locations: vehicle.booked_locations || []
          };
        } catch (error) {
          logger.error('Error processing vehicle:', {
            error: error instanceof Error ? error.message : 'Unknown error',
            vehicleId: vehicle.id,
            location: vehicle.location,
            images: vehicle.images
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

    // Look for the SQL query first, ensure it's fetching price_per_hour correctly
    const vehiclesQuery = `
      SELECT 
        v.id, 
        v.name, 
        v.type, 
        v.location, 
        v.quantity,
        v.price_per_hour,
        v.price_7_days, 
        v.price_15_days, 
        v.price_30_days,
        v.min_booking_hours,
        v.images, 
        v.status, 
        v.is_available,
        v.created_at,
        v.updated_at,
        ARRAY_AGG(DISTINCT b.pickup_location) as booked_locations
      FROM vehicles v
      LEFT JOIN bookings b ON v.id = b.vehicle_id 
        AND b.status NOT IN ('cancelled', 'failed') 
        AND b.payment_status != 'failed'
        AND (
          (b.start_date - interval '2 hours', b.end_date + interval '2 hours') OVERLAPS ($1::timestamp, $2::timestamp)
          OR ($1::timestamp BETWEEN (b.start_date - interval '2 hours') AND (b.end_date + interval '2 hours'))
          OR ($2::timestamp BETWEEN (b.start_date - interval '2 hours') AND (b.end_date + interval '2 hours'))
          OR (b.start_date - interval '2 hours') BETWEEN $1::timestamp AND $2::timestamp
          OR (b.end_date + interval '2 hours') BETWEEN $1::timestamp AND $2::timestamp
        )
      WHERE 
        v.status = 'active' 
        AND v.is_available = true
      GROUP BY v.id
      ORDER BY v.name ASC
    `;

    // Then, make sure when formatting the response that the price is properly sent
    // Somewhere in the response mapping code, ensure we're handling the price properly
    const formattedVehicles = await Promise.all(
      processedVehicles.map(async (vehicle: VehicleRow) => {
        try {
          // Parse locations - ensuring it's an array
          let locations = [];
          try {
            locations = Array.isArray(vehicle.location)
              ? vehicle.location
              : typeof vehicle.location === 'string'
                ? JSON.parse(vehicle.location)
                : [];
          } catch (e) {
            locations = typeof vehicle.location === 'string' ? [vehicle.location] : [];
          }

          // Parse images - ensuring it's an array
          let images: string[] = [];
          try {
            images = Array.isArray(vehicle.images)
              ? vehicle.images
              : typeof vehicle.images === 'string'
                ? JSON.parse(vehicle.images)
                : [];
          } catch (e) {
            images = [];
          }

          // Get available locations based on bookings
          const availableLocations = await getAvailableLocations(
            vehicle.id,
            locations,
            pickupDate,
            dropoffDate
          );

          // Make sure we're capturing both camelCase and snake_case versions of price
          // Only use the properties that exist in the VehicleRow interface
          const price = Number(vehicle.price_per_hour || 0);
          const minHours = Number(vehicle.min_booking_hours || 1);

          // Calculate pricing for this booking duration
          // Convert string dates to Date objects for calculatePrice
          const pricing = pickupDate && dropoffDate 
            ? calculatePrice(price, new Date(pickupDate), new Date(dropoffDate))
            : { totalHours: 0, chargeableHours: 0, totalPrice: 0 };

          return {
            id: vehicle.id,
            name: vehicle.name,
            type: vehicle.type,
            price_per_hour: price,
            pricePerHour: price,
            min_booking_hours: minHours,
            minBookingHours: minHours,
            price_7_days: vehicle.price_7_days,
            price_15_days: vehicle.price_15_days,
            price_30_days: vehicle.price_30_days,
            location: availableLocations,
            images: images,
            status: vehicle.status,
            is_available: vehicle.is_available,
            isAvailable: vehicle.is_available,
            created_at: vehicle.created_at,
            updated_at: vehicle.updated_at,
            pricing: pricing
          };
        } catch (error) {
          logger.error('Error formatting vehicle:', {
            vehicleId: vehicle.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          return null;
        }
      })
    );

    return NextResponse.json({ vehicles: formattedVehicles });
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
      pricePerHour,
      description,
      features,
      images,
      status = 'active',
    } = body as CreateVehicleBody;

    // Validate required fields
    if (!name || !type || !pricePerHour) {
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
        pricePerHour,
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