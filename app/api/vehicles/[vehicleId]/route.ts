import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';

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

// GET /api/vehicles/[vehicleId] - Get vehicle by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, params.vehicleId))
      .limit(1);

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(vehicle);

  } catch (error) {
    logger.error('Failed to fetch vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

// PATCH /api/vehicles/[vehicleId] - Update vehicle
export async function PATCH(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Verify authentication
    const user = await verifyAuth();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, type, location, price_per_hour, min_booking_hours, is_available, images, status } = body;

    // Update vehicle
    const [updatedVehicle] = await db
      .update(vehicles)
      .set({
        ...(name && { name }),
        ...(type && { type }),
        ...(location && { location }),
        ...(price_per_hour && { price_per_hour }),
        ...(min_booking_hours && { min_booking_hours }),
        ...(typeof is_available === 'boolean' && { is_available }),
        ...(images && { images }),
        ...(status && { status }),
        updated_at: sql`CURRENT_TIMESTAMP`
      })
      .where(eq(vehicles.id, params.vehicleId))
      .returning();

    if (!updatedVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

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

// DELETE /api/vehicles/[vehicleId] - Delete vehicle
export async function DELETE(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Verify authentication and admin role
    const authResult = await verifyAuth();
    if (!authResult || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get vehicle
    const [vehicle] = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, params.vehicleId))
      .limit(1);

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Delete vehicle images from blob storage
    if (vehicle.images) {
      for (const image of vehicle.images) {
        await del(image);
      }
    }

    // Delete vehicle from database
    await db
      .delete(vehicles)
      .where(eq(vehicles.id, params.vehicleId));

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