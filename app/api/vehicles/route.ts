import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';
import logger from '@/lib/logger';
import { COLLECTIONS, generateId, findMany, set } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import type { Vehicle, User } from '@/lib/types';

interface CreateVehicleBody {
  name: string;
  description: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  seats: number;
  transmission: 'manual' | 'automatic';
  fuelType: string;
  pricePerDay: number;
  location: string;
  images: string[];
}

// GET /api/vehicles - List all vehicles
export async function GET() {
  try {
    // Get all vehicles from KV store
    const pattern = `${COLLECTIONS.VEHICLES}:*`;
    const keys = await kv.keys(pattern);
    const vehicles: Vehicle[] = [];

    // Fetch each vehicle
    for (const key of keys) {
      const data = await kv.get<string>(key);
      if (data) {
        vehicles.push(JSON.parse(data));
      }
    }

    return NextResponse.json({
      success: true,
      vehicles: vehicles.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    });

  } catch (error) {
    logger.error('Failed to fetch vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Create a new vehicle
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as CreateVehicleBody;
    const {
      name,
      description,
      type,
      brand,
      model,
      year,
      color,
      licensePlate,
      seats,
      transmission,
      fuelType,
      pricePerDay,
      location,
      images
    } = body;

    // Validate required fields
    if (!name || !type || !brand || !model || !year || !licensePlate || !pricePerDay || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if license plate is unique
    const existingVehicle = await findMany<Vehicle>(COLLECTIONS.VEHICLES, 'licensePlate', licensePlate);
    if (existingVehicle.length > 0) {
      return NextResponse.json(
        { error: 'Vehicle with this license plate already exists' },
        { status: 400 }
      );
    }

    // Create vehicle
    const vehicleId = generateId('veh');
    const vehicle: Vehicle = {
      id: vehicleId,
      name,
      description,
      type,
      brand,
      model,
      year,
      color,
      licensePlate,
      seats,
      transmission,
      fuelType,
      pricePerDay,
      location,
      images,
      isAvailable: true,
      owner_id: authResult.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await set(COLLECTIONS.VEHICLES, vehicle);

    logger.debug('Vehicle created successfully:', { vehicleId });

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