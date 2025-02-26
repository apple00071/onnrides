import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db, query } from '@/lib/db';
import logger from '@/lib/logger';
import type { Vehicle, VehicleStatus } from '@/lib/schema';
import { revalidatePath } from 'next/cache';

export async function GET(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vehicleId } = params;

    const vehicle = await db
      .selectFrom('vehicles')
      .selectAll()
      .where('id', '=', vehicleId)
      .executeTakeFirst();

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json({ vehicle });
  } catch (error) {
    logger.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    logger.info('Updating vehicle with data:', data);

    // Process numeric fields
    const updateData: Record<string, any> = {
      name: data.name,
      type: data.type,
      price_per_hour: Number(data.price_per_hour),
      price_7_days: data.price_7_days ? Number(data.price_7_days) : null,
      price_15_days: data.price_15_days ? Number(data.price_15_days) : null,
      price_30_days: data.price_30_days ? Number(data.price_30_days) : null,
      is_available: data.is_available
    };

    // Ensure location is properly formatted
    if (data.location) {
      let location = data.location;
      if (typeof location === 'string') {
        location = [location];
      } else if (Array.isArray(location)) {
        location = location.map(loc => loc.trim()).filter(Boolean);
      } else if (typeof location === 'object' && location.name) {
        location = Array.isArray(location.name) ? location.name : [location.name];
      }
      updateData.location = JSON.stringify(location);
    }

    // Convert images to JSON if present
    if (data.images) {
      updateData.images = JSON.stringify(data.images);
    }

    // Update the vehicle
    const [updatedVehicle] = await db
      .updateTable('vehicles')
      .set({
        ...updateData,
        updated_at: new Date()
      })
      .where('id', '=', params.vehicleId)
      .returning([
        'id',
        'name',
        'type',
        'location',
        'quantity',
        'price_per_hour',
        'price_7_days',
        'price_15_days',
        'price_30_days',
        'min_booking_hours',
        'images',
        'status',
        'is_available',
        'created_at',
        'updated_at'
      ])
      .execute();

    if (!updatedVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Format the response
    const formattedVehicle = {
      ...updatedVehicle,
      location: JSON.parse(updatedVehicle.location),
      images: JSON.parse(updatedVehicle.images)
    };

    return NextResponse.json({
      success: true,
      data: {
        vehicle: formattedVehicle
      }
    });
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vehicleId } = params;

    // Check if vehicle exists
    const vehicle = await db
      .selectFrom('vehicles')
      .selectAll()
      .where('id', '=', vehicleId)
      .executeTakeFirst();

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Delete the vehicle
    await db
      .deleteFrom('vehicles')
      .where('id', '=', vehicleId)
      .execute();

    return NextResponse.json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
} 