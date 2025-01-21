import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { vehicles, type VehicleType, type VehicleStatus, VEHICLE_TYPES } from '@/lib/schema';
import { and, eq, sql, desc } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';
import type { Session } from 'next-auth';

interface Vehicle {
  id: string;
  name: string;
  type: VehicleType;
  location: string;
  quantity: number;
  price_per_hour: number;
  images: string[];
  is_available: boolean;
  status: VehicleStatus;
  created_at: Date;
  updated_at: Date;
}

interface CreateVehicleBody {
  name: string;
  type: VehicleType;
  location: string;
  quantity: number;
  price_per_hour: number;
  images?: string[];
}

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
  const totalHours = Math.ceil(diffMs / (1000 * 60 * 60));
  
  // Check if any part of the booking is on a weekend
  let isWeekendBooking = false;
  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    if (isWeekend(currentDate)) {
      isWeekendBooking = true;
      break;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Determine minimum booking hours based on weekend/weekday
  const minHours = isWeekendBooking ? 24 : 12;
  const chargeableHours = Math.max(totalHours, minHours);
  const totalPrice = pricePerHour * chargeableHours;

  return {
    totalHours,
    chargeableHours,
    totalPrice
  };
}

// GET /api/vehicles - List all vehicles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const locations = searchParams.getAll('location');
    const pickupDate = searchParams.get('pickupDate');
    const pickupTime = searchParams.get('pickupTime');
    const dropoffDate = searchParams.get('dropoffDate');
    const dropoffTime = searchParams.get('dropoffTime');

    logger.info('Search params:', { type, locations, pickupDate, pickupTime, dropoffDate, dropoffTime });

    const conditions = [];

    if (type) {
      conditions.push(eq(vehicles.type, type));
    }

    if (locations.length > 0) {
      conditions.push(sql`${vehicles.location}::text[] && ${locations}::text[]`);
    }

    // Only select columns that definitely exist
    const availableVehicles = await db
      .select({
        id: vehicles.id,
        name: vehicles.name,
        type: vehicles.type,
        quantity: vehicles.quantity,
        price_per_hour: vehicles.price_per_hour,
        location: vehicles.location,
        images: vehicles.images,
        is_available: vehicles.is_available,
        status: vehicles.status,
      })
      .from(vehicles)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    // Calculate pricing based on duration if dates are provided
    const vehiclesWithPricing = availableVehicles.map(vehicle => {
      let pricing = {
        price_per_hour: Number(vehicle.price_per_hour),
        total_hours: 0,
        chargeable_hours: 12, // Default to minimum 12 hours
        total_price: Number(vehicle.price_per_hour) * 12
      };

      if (pickupDate && pickupTime && dropoffDate && dropoffTime) {
        const startDate = new Date(`${pickupDate}T${pickupTime}`);
        const endDate = new Date(`${dropoffDate}T${dropoffTime}`);
        
        const calculatedPricing = calculatePrice(
          Number(vehicle.price_per_hour),
          startDate,
          endDate
        );

        pricing = {
          price_per_hour: Number(vehicle.price_per_hour),
          total_hours: calculatedPricing.totalHours,
          chargeable_hours: calculatedPricing.chargeableHours,
          total_price: calculatedPricing.totalPrice
        };
      }

      // Parse location and images
      const location = typeof vehicle.location === 'string' 
        ? vehicle.location.split(',').map(l => l.trim())
        : vehicle.location;

      // Parse images
      let images: string[] = [];
      try {
        if (typeof vehicle.images === 'string') {
          // Always try to parse as JSON first
          try {
            images = JSON.parse(vehicle.images);
          } catch {
            // If JSON parsing fails, try splitting by comma
            images = vehicle.images.split(',').map(i => i.trim());
          }
        } else if (Array.isArray(vehicle.images)) {
          images = vehicle.images;
        }
        
        // Validate each image URL
        images = images.filter(url => {
          try {
            new URL(url);
            return true;
          } catch {
            logger.error('Invalid image URL:', url);
            return false;
          }
        });

        // Log the final images array for debugging
        logger.info('Parsed vehicle images:', {
          vehicleId: vehicle.id,
          vehicleName: vehicle.name,
          originalImages: vehicle.images,
          parsedImages: images
        });
      } catch (error) {
        logger.error('Error parsing vehicle images:', error);
        images = [];
      }

      return {
        ...vehicle,
        location,
        images,
        image_url: images.length > 0 ? images[0] : '/placeholder.png',
        price_per_hour: vehicle.price_per_hour.toString(),
        pricing
      };
    });

    return NextResponse.json({ vehicles: vehiclesWithPricing });
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Create vehicle
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAuth();
    if (!session?.user?.role || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as CreateVehicleBody;

    // Validate required fields
    const requiredFields = ['name', 'type', 'location', 'quantity', 'price_per_hour'] as const;
    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate vehicle type
    if (!VEHICLE_TYPES.includes(body.type)) {
      return NextResponse.json(
        { error: `Invalid vehicle type. Must be one of: ${VEHICLE_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // Create vehicle with proper type conversions
    const [vehicle] = await db
      .insert(vehicles)
      .values({
        name: body.name,
        type: body.type,
        location: body.location,
        quantity: body.quantity,
        price_per_hour: String(body.price_per_hour),
        images: JSON.stringify(body.images || []),
        is_available: true,
        status: 'active' as const,
      })
      .returning();

    return NextResponse.json({
      message: 'Vehicle created successfully',
      vehicle: {
        ...vehicle,
        images: Array.isArray(vehicle.images) ? vehicle.images : JSON.parse(vehicle.images),
        price_per_hour: Number(vehicle.price_per_hour),
      },
    });
  } catch (error) {
    logger.error('Failed to create vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 