import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import logger from '@/lib/logger';
import { COLLECTIONS, get, update, remove } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import type { Vehicle } from '@/lib/types';

interface UpdateVehicleBody {
  name?: string;
  description?: string;
  type?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  licensePlate?: string;
  seats?: number;
  transmission?: 'manual' | 'automatic';
  fuelType?: string;
  pricePerDay?: number;
  location?: string;
  images?: string[];
  isAvailable?: boolean;
}

// GET /api/vehicles/[id] - Get vehicle by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicle = await get<Vehicle>(COLLECTIONS.VEHICLES, params.id);
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle
    });

  } catch (error) {
    logger.error('Failed to fetch vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

// PATCH /api/vehicles/[id] - Update vehicle
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get existing vehicle
    const vehicle = await get<Vehicle>(COLLECTIONS.VEHICLES, params.id);
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const body = await request.json() as UpdateVehicleBody;

    // Update vehicle
    await update(COLLECTIONS.VEHICLES, params.id, {
      ...body,
      updatedAt: new Date()
    });

    // Get updated vehicle
    const updatedVehicle = await get<Vehicle>(COLLECTIONS.VEHICLES, params.id);

    return NextResponse.json({
      success: true,
      message: 'Vehicle updated successfully',
      vehicle: updatedVehicle
    });

  } catch (error) {
    logger.error('Failed to update vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

// DELETE /api/vehicles/[id] - Delete vehicle
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get vehicle
    const vehicle = await get<Vehicle>(COLLECTIONS.VEHICLES, params.id);
    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Delete vehicle images from blob storage
    for (const imageUrl of vehicle.images) {
      await del(imageUrl);
    }

    // Delete vehicle from KV store
    await remove(COLLECTIONS.VEHICLES, params.id);

    return NextResponse.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
} 