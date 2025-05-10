import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { DEFAULT_VEHICLE_IMAGE } from '@/lib/utils/image-utils';
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

// Helper function to clean location data
function cleanLocationData(location: string | string[]): string[] {
  if (Array.isArray(location)) {
    return location.map(loc => {
      // Remove any quotes and brackets
      return loc.replace(/[\[\]"]/g, '').trim();
    }).filter(Boolean);
  }
  
  if (typeof location === 'string') {
    try {
      // Try parsing as JSON if it starts with [ or "
      if (location.startsWith('[') || location.startsWith('"')) {
        const parsed = JSON.parse(location);
        return Array.isArray(parsed) 
          ? parsed.map(loc => typeof loc === 'string' ? loc.trim() : String(loc)).filter(Boolean)
          : [parsed].map(loc => typeof loc === 'string' ? loc.trim() : String(loc)).filter(Boolean);
      }
      // Single location string
      return [location.trim()];
    } catch (e) {
      // If parsing fails, treat as single location
      return [location.trim()];
    }
  }
  
  return [];
}

// Helper function to get available locations for a vehicle
async function getAvailableLocations(
  vehicleId: string,
  locations: string[] | string,
  pickupDateStr: string | null,
  dropoffDateStr: string | null
) {
  // Clean and parse locations first
  const allLocations = cleanLocationData(locations);
  
  // Convert string dates to Date objects if they exist
  const pickupDateTime = pickupDateStr ? new Date(pickupDateStr) : null;
  const dropoffDateTime = dropoffDateStr ? new Date(dropoffDateStr) : null;

  if (!pickupDateTime || !dropoffDateTime) {
    return allLocations;
  }

  try {
    logger.info('Starting location availability check:', {
      vehicleId,
      locations: allLocations,
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
        JOIN vehicles v ON b.vehicle_id = v.id::uuid
        WHERE b.vehicle_id = $1::uuid
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
      rows: bookingsResult.rows
    });

    // Create a set of unavailable locations
    const unavailableLocations = new Set<string>();
    
    bookingsResult.rows.forEach((row: BookingRow) => {
      try {
        const locationValue = row.effective_location;
        if (locationValue) {
          const cleanedLocation = cleanLocationData(locationValue)[0];
          if (cleanedLocation) {
            logger.info('Location unavailable due to concurrent bookings:', {
              location: cleanedLocation,
              concurrent_bookings: row.concurrent_bookings,
              vehicle_quantity: row.vehicle_quantity,
              bookingId: row.id,
              timeRange: `${row.start_date} to ${row.end_date}`
            });
            unavailableLocations.add(cleanedLocation);
          }
        }
      } catch (error) {
        logger.error('Error processing location:', {
          error,
          bookingId: row.id,
          effective_location: row.effective_location
        });
      }
    });

    // Filter out unavailable locations
    const availableLocations = allLocations.filter(loc => !unavailableLocations.has(loc));

    logger.info('Final availability check results:', {
      allLocations,
      availableLocations,
      unavailableLocations: Array.from(unavailableLocations),
      requestedTimeRange: {
        start: pickupDateTime.toISOString(),
        end: dropoffDateTime.toISOString()
      },
      vehicleId
    });

    return availableLocations;
  } catch (error) {
    logger.error('Error checking location availability:', {
      error,
      vehicleId,
      locations: allLocations
    });
    return allLocations;
  }
}

interface DatabaseVehicle {
  id: string;
  name: string;
  type: string;
  images: string | null;
  price_per_hour: number;
  price_7_days: number;
  price_15_days: number;
  price_30_days: number;
  description: string | null;
  location: string | null;
  is_available: boolean;
  status: string;
}

const vehicles = [
  {
    id: '1',
    name: "Honda Activa 6G",
    images: ["https://onnbikes.com/bikes/honda-activa-6g.jpg"],
    description: "Honda Activa 6G with comfortable seating and smooth handling.",
    transmission_type: "Automatic Transmission",
    engine_capacity: 110,
    seating_capacity: 2,
    price_per_hour: 20,
    price_7_days: 140,
    price_15_days: 200,
    price_30_days: 280,
    type: "scooter"
  },
  {
    id: '2',
    name: "Honda Dio",
    images: ["https://onnbikes.com/bikes/honda-dio.jpg"],
    description: "Honda Dio with stylish design and excellent mileage.",
    transmission_type: "Automatic Transmission",
    engine_capacity: 110,
    seating_capacity: 2,
    price_per_hour: 25,
    price_7_days: 175,
    price_15_days: 250,
    price_30_days: 350,
    type: "scooter"
  },
  {
    id: '3',
    name: "Suzuki Access 125",
    images: ["https://onnbikes.com/bikes/suzuki-access-125.jpg"],
    description: "Suzuki Access 125 with powerful engine and premium features.",
    transmission_type: "Automatic Transmission",
    engine_capacity: 125,
    seating_capacity: 2,
    price_per_hour: 30,
    price_7_days: 210,
    price_15_days: 300,
    price_30_days: 420,
    type: "scooter"
  },
  {
    id: '4',
    name: "Royal Enfield Classic 350",
    images: ["https://onnbikes.com/bikes/royal-enfield-classic-350.jpg"],
    description: "Royal Enfield Classic 350 with iconic design and powerful performance.",
    transmission_type: "Manual Transmission",
    engine_capacity: 350,
    seating_capacity: 2,
    price_per_hour: 42,
    price_7_days: 294,
    price_15_days: 420,
    price_30_days: 588,
    type: "bike"
  }
];

// GET /api/vehicles - List all vehicles
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const featured = searchParams.get('featured');

    let queryText = `
      SELECT 
        id, 
        name, 
        type,
        images::text as images,
        price_per_hour,
        price_7_days,
        price_15_days,
        price_30_days,
        description,
        location,
        is_available,
        status
      FROM vehicles 
      WHERE is_available = true
    `;

    if (featured === 'true') {
      queryText += ` AND status = 'active'`;
    }

    queryText += ` ORDER BY created_at DESC`;

    if (limit) {
      queryText += ` LIMIT $1`;
    }

    const result = await query(queryText, limit ? [limit] : []);

    logger.info('Raw vehicles data:', result.rows);

    const vehicles = result.rows.map((vehicle: DatabaseVehicle) => {
      let images: string[] = [];
      try {
        if (vehicle.images) {
          // Parse the JSON string into an array
          const parsedImages = JSON.parse(vehicle.images);
          images = Array.isArray(parsedImages) ? parsedImages : [];
        }
      } catch (error) {
        logger.error('Error parsing vehicle images:', error);
      }

      const transformedVehicle = {
        id: vehicle.id,
        name: vehicle.name,
        images: images.length > 0 ? images : [DEFAULT_VEHICLE_IMAGE],
        description: vehicle.description || vehicle.name,
        transmission_type: vehicle.type === 'scooter' ? 'Automatic Transmission' : 'Manual Transmission',
        engine_capacity: vehicle.type === 'scooter' ? 110 : 350,
        seating_capacity: 2,
        price_per_hour: vehicle.price_per_hour,
        price_7_days: vehicle.price_7_days,
        price_15_days: vehicle.price_15_days,
        price_30_days: vehicle.price_30_days,
        type: vehicle.type,
        location: vehicle.location ? JSON.parse(vehicle.location) : ['Erragadda', 'Madhapur']
      };

      logger.info('Transformed vehicle data:', transformedVehicle);
      return transformedVehicle;
    });

    return NextResponse.json({ vehicles });
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}