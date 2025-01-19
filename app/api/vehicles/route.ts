import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { vehicles } from '@/lib/schema';
import { eq, and, inArray, ilike, gte, lte } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';

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
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const location = searchParams.get('location');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const isAvailable = searchParams.get('isAvailable');

    const conditions = [];

    if (type) {
      conditions.push(eq(vehicles.type, type));
    }

    if (location) {
      conditions.push(eq(vehicles.location, location));
    }

    if (minPrice) {
      conditions.push(gte(vehicles.price_per_day, minPrice));
    }

    if (maxPrice) {
      conditions.push(lte(vehicles.price_per_day, maxPrice));
    }

    if (isAvailable === 'true') {
      conditions.push(eq(vehicles.is_available, true));
    }

    const availableVehicles = await db
      .select()
      .from(vehicles)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(vehicles.created_at);

    return NextResponse.json(availableVehicles);
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