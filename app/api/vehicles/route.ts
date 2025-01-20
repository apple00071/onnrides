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
  price_per_day: number;
  min_booking_hours: number;
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
  price_per_day: number;
  min_booking_hours?: number;
  images?: string[];
}

// GET /api/vehicles - List all vehicles
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') as VehicleType | null;
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const locations = searchParams.getAll('locations');

    logger.info('Search params:', { type, locations, minPrice, maxPrice });

    const conditions = [];

    // Add type filter
    if (type) {
      conditions.push(eq(vehicles.type, type));
    }

    // Add location filter
    if (locations.length > 0) {
      conditions.push(sql`${vehicles.location}::text = ANY(array[${locations}])`);
    }

    // Add price range filter
    if (minPrice) {
      conditions.push(sql`${vehicles.price_per_day} >= ${minPrice}::decimal`);
    }
    if (maxPrice) {
      conditions.push(sql`${vehicles.price_per_day} <= ${maxPrice}::decimal`);
    }

    // Add availability filter
    conditions.push(eq(vehicles.is_available, true));
    conditions.push(eq(vehicles.status, 'active'));

    // Execute query with all conditions
    const availableVehicles = await db
      .select({
        id: vehicles.id,
        name: vehicles.name,
        type: vehicles.type,
        location: vehicles.location,
        quantity: vehicles.quantity,
        price_per_day: vehicles.price_per_day,
        min_booking_hours: vehicles.min_booking_hours,
        images: vehicles.images,
        is_available: vehicles.is_available,
        status: vehicles.status,
        created_at: vehicles.created_at,
        updated_at: vehicles.updated_at,
      })
      .from(vehicles)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(vehicles.created_at));

    return NextResponse.json({
      vehicles: availableVehicles.map(vehicle => ({
        ...vehicle,
        images: vehicle.images,
        price_per_day: Number(vehicle.price_per_day),
      }))
    });
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to load vehicles. Please try again.' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Create vehicle
export async function POST(request: NextRequest) {
  try {
    const session = await verifyAuth();
    if (!session || !session.role || session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = (await request.json()) as CreateVehicleBody;

    // Validate required fields
    const requiredFields = ['name', 'type', 'location', 'quantity', 'price_per_day'] as const;
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
        price_per_day: String(body.price_per_day),
        min_booking_hours: body.min_booking_hours || 1,
        images: body.images || [],
        is_available: true,
        status: 'active' as const,
      })
      .returning();

    return NextResponse.json({
      message: 'Vehicle created successfully',
      vehicle: {
        ...vehicle,
        images: vehicle.images,
        price_per_day: Number(vehicle.price_per_day),
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