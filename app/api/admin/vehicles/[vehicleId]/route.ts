import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';
import logger from '@/lib/logger';
import type { Session } from 'next-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const session = await verifyAuth();
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const vehicle = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, params.vehicleId))
      .limit(1);

    if (!vehicle.length) {
      return NextResponse.json(
        { message: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Vehicle fetched successfully',
      vehicle: vehicle[0]
    });
  } catch (error) {
    logger.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { message: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const session = await verifyAuth();
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { vehicleId } = params;
    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.type || !data.price_per_hour || !data.location) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update vehicle
    const updatedVehicle = await db.update(vehicles)
      .set({
        name: data.name,
        type: data.type,
        location: Array.isArray(data.location) ? data.location.join(',') : data.location,
        quantity: data.quantity || 1,
        price_per_hour: data.price_per_hour.toString(),
        min_booking_hours: data.min_booking_hours || 12,
        images: Array.isArray(data.images) ? data.images.join(',') : data.images || '',
        is_available: data.is_available ?? true,
        status: data.status || 'active',
        updated_at: new Date().toISOString(),
      })
      .where(eq(vehicles.id, vehicleId))
      .returning();

    if (!updatedVehicle.length) {
      return NextResponse.json(
        { message: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Vehicle updated successfully',
      vehicle: updatedVehicle[0]
    });
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { message: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const session = await verifyAuth();
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const deletedVehicle = await db
      .delete(vehicles)
      .where(eq(vehicles.id, params.vehicleId))
      .returning();

    if (!deletedVehicle.length) {
      return NextResponse.json(
        { message: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Vehicle deleted successfully',
      vehicle: deletedVehicle[0]
    });
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { message: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
} 