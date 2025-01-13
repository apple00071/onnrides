import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { findAll, insertOne, COLLECTIONS } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

interface Vehicle {
  id?: string;
  name: string;
  type: string;
  location: string[];
  quantity: number;
  price_per_day: number;
  image_url?: string;
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
  image_url?: string;
}

// GET /api/vehicles - List all vehicles
export async function GET(request: NextRequest) {
  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const pickupDate = searchParams.get('pickupDate');
    const dropoffDate = searchParams.get('dropoffDate');

    // For now, just fetch all vehicles
    // TODO: Implement date-based filtering
    const vehicles = await findAll<Vehicle>(COLLECTIONS.VEHICLES);

    return NextResponse.json(vehicles);
  } catch (error) {
    logger.error('Failed to fetch vehicles:', error);
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

    const body = await request.json() as CreateVehicleBody;

    // Create vehicle
    const vehicleData: Vehicle = {
      name: body.name,
      type: body.type,
      location: body.location,
      quantity: body.quantity,
      price_per_day: body.price_per_day,
      image_url: body.image_url,
      is_available: true,
      status: 'available'
    };

    const vehicle = await insertOne<Vehicle>(COLLECTIONS.VEHICLES, vehicleData);

    return NextResponse.json({
      success: true,
      message: 'Vehicle created successfully',
      vehicle
    });

  } catch (error) {
    logger.error('Failed to create vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
} 