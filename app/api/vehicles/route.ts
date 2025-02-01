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

// GET /api/vehicles - List all vehicles
export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const locations = searchParams.getAll('location');
    const pickupDate = searchParams.get('pickupDate');
    const pickupTime = searchParams.get('pickupTime');
    const dropoffDate = searchParams.get('dropoffDate');
    const dropoffTime = searchParams.get('dropoffTime');
    const minPrice = Number(searchParams.get('minPrice')) || 0;
    const maxPrice = Number(searchParams.get('maxPrice')) || Number.MAX_SAFE_INTEGER;

    // Convert time to nearest hour
    let startDate, endDate;
    if (pickupDate && pickupTime && dropoffDate && dropoffTime) {
      // Time is already in 24-hour format (HH:mm)
      const pickupHour = parseInt(pickupTime.split(':')[0]);
      const dropoffHour = parseInt(dropoffTime.split(':')[0]);

      startDate = new Date(`${pickupDate}T${pickupHour.toString().padStart(2, '0')}:00:00`);
      endDate = new Date(`${dropoffDate}T${dropoffHour.toString().padStart(2, '0')}:00:00`);
    }

    logger.info('Search params:', { 
      type, locations, startDate, endDate, minPrice, maxPrice 
    });

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
      AND ($2::numeric IS NULL OR v.price_per_hour >= $2)
      AND ($3::numeric IS NULL OR v.price_per_hour <= $3)
      AND v.status = 'active'
      AND v.is_available = true
      AND (
        $4::text[] IS NULL 
        OR v.location::jsonb ?| $4
      )
    `, [type, minPrice, maxPrice, locations.length > 0 ? locations : null]);

    // Process the vehicles data
    const vehicles = result.rows.map(vehicle => {
      let parsedLocation;
      let parsedImages;

      try {
        parsedLocation = JSON.parse(vehicle.location);
      } catch (e) {
        parsedLocation = vehicle.location ? [vehicle.location] : [];
      }

      try {
        parsedImages = JSON.parse(vehicle.images);
      } catch (e) {
        parsedImages = vehicle.images ? [vehicle.images] : [];
      }

      return {
        ...vehicle,
        location: parsedLocation,
        images: parsedImages,
        price_per_hour: Number(vehicle.price_per_hour).toFixed(2)
      };
    });

    return NextResponse.json({ vehicles });
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch vehicles',
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