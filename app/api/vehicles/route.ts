import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { COLLECTIONS, generateId, findAll, findManyBy, insertOne } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import type { Vehicle } from '@/lib/types';

interface CreateVehicleBody {
  name: string;
  description: string;
  type: 'car' | 'bike';
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
  imageUrl: string;
}

// GET /api/vehicles - List all vehicles
export async function GET() {
  try {
    const vehicles = await findAll<Vehicle>(COLLECTIONS.VEHICLES);

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

// POST /api/vehicles - Create vehicle
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
    const { licensePlate } = body;

    // Check if license plate is unique
    const existingVehicles = await findManyBy<Vehicle>(COLLECTIONS.VEHICLES, 'licensePlate', licensePlate);
    if (existingVehicles.length > 0) {
      return NextResponse.json(
        { error: 'Vehicle with this license plate already exists' },
        { status: 400 }
      );
    }

    // Create vehicle
    const vehicleData: Omit<Vehicle, 'id'> = {
      ...body,
      seatingCapacity: body.seats,
      registrationNumber: body.licensePlate,
      mileage: 0,
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date()
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