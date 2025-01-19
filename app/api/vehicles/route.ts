import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { vehicles } from '@/lib/schema';
import { eq, and, inArray, ilike } from 'drizzle-orm';

interface Vehicle {
  id?: string;
  name: string;
  type: string;
  location: string | string[] | { name: string[] };
  quantity: number;
  price_per_day: number;
  price_12hrs: number;
  price_24hrs: number;
  price_7days: number;
  price_15days: number;
  price_30days: number;
  min_booking_hours: number;
  images: string[];
  is_available: boolean;
  status: 'available' | 'booked' | 'maintenance';
  created_at?: string;
  updated_at?: string;
}

interface CreateVehicleBody {
  name: string;
  type: string;
  location: string[];
  quantity: number;
  price_per_day: number;
  price_12hrs: number;
  price_24hrs: number;
  price_7days: number;
  price_15days: number;
  price_30days: number;
  min_booking_hours: number;
  image_url?: string;
  is_available: boolean;
  status: 'available' | 'booked' | 'maintenance';
}

// GET /api/vehicles - List all vehicles
export async function GET(request: NextRequest) {
  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const pickupDate = searchParams.get('pickupDate');
    const dropoffDate = searchParams.get('dropoffDate');
    const locations = searchParams.get('locations')?.split(',').filter(Boolean);
    const type = searchParams.get('type');

    // Build query conditions
    let conditions = [];

    // Filter by type if provided
    if (type) {
      logger.info('Filtering by type:', type);
      // First get all vehicles to check what types exist
      const allVehicles = await db.select().from(vehicles);
      logger.info('All vehicle types:', allVehicles.map(v => v.type));
      
      // Use case-insensitive comparison
      conditions.push(ilike(vehicles.type, type));
    }

    // Filter by location if provided
    if (locations && locations.length > 0) {
      logger.info('Filtering by locations:', locations);
      conditions.push(
        inArray(
          vehicles.location,
          locations.map(loc => JSON.stringify([loc]))
        )
      );
    }

    // Filter by availability
    conditions.push(eq(vehicles.is_available, true));
    conditions.push(eq(vehicles.status, 'active' as const));

    logger.info('Query conditions:', conditions);

    // Fetch vehicles with conditions
    const vehiclesList = await db
      .select()
      .from(vehicles)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    logger.info('Found vehicles:', vehiclesList);

    // Format response data
    const formattedVehicles = vehiclesList.map(vehicle => {
      // Handle location parsing
      let locationData: string[] = [];
      try {
        if (typeof vehicle.location === 'string') {
          locationData = JSON.parse(vehicle.location);
        } else if (typeof vehicle.location === 'object' && 'name' in vehicle.location) {
          locationData = (vehicle.location as { name: string[] }).name;
        } else if (Array.isArray(vehicle.location)) {
          locationData = vehicle.location;
        } else {
          locationData = [String(vehicle.location)];
        }
      } catch (e) {
        locationData = [String(vehicle.location)];
      }

      return {
        ...vehicle,
        location: locationData,
        price_per_day: Number(vehicle.price_per_day),
        price_12hrs: Number(vehicle.price_12hrs),
        price_24hrs: Number(vehicle.price_24hrs),
        price_7days: Number(vehicle.price_7days),
        price_15days: Number(vehicle.price_15days),
        price_30days: Number(vehicle.price_30days),
        images: Array.isArray(vehicle.images) ? vehicle.images : []
      };
    });

    logger.info('Formatted vehicles:', formattedVehicles);

    return NextResponse.json(formattedVehicles);
  } catch (error) {
    logger.error('Failed to fetch vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Create vehicle
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'type', 'location', 'quantity', 'price_per_day'];
    const missingFields = requiredFields.filter(field => !body[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Create vehicle with proper type conversions
    const [vehicle] = await db.insert(vehicles).values({
      name: body.name,
      type: body.type,
      location: JSON.stringify(Array.isArray(body.location) ? body.location : [body.location]),
      quantity: Number(body.quantity),
      price_per_day: String(body.price_per_day),
      price_12hrs: String(body.price_12hrs || 0),
      price_24hrs: String(body.price_24hrs || 0),
      price_7days: String(body.price_7days || 0),
      price_15days: String(body.price_15days || 0),
      price_30days: String(body.price_30days || 0),
      min_booking_hours: Number(body.min_booking_hours || 1),
      images: Array.isArray(body.images) ? body.images : [],
      is_available: true,
      status: 'active' as const
    }).returning();

    return NextResponse.json({
      success: true,
      message: 'Vehicle created successfully',
      vehicle: {
        ...vehicle,
        location: JSON.parse(vehicle.location as string),
        price_per_day: Number(vehicle.price_per_day),
        price_12hrs: Number(vehicle.price_12hrs),
        price_24hrs: Number(vehicle.price_24hrs),
        price_7days: Number(vehicle.price_7days),
        price_15days: Number(vehicle.price_15days),
        price_30days: Number(vehicle.price_30days)
      }
    });

  } catch (error) {
    logger.error('Failed to create vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 