import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import logger from '@/lib/logger';
import type { Vehicle, VehicleStatus } from '@/lib/schema';

export async function GET(
  _request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const db = getDb();
    const vehicle = await db
      .selectFrom('vehicles')
      .selectAll()
      .where('id', '=', params.vehicleId)
      .executeTakeFirst();

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(vehicle);
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
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.type || !data.status || !data.price_per_hour) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Update vehicle
    const [vehicle] = await db
      .updateTable('vehicles')
      .set({
        name: data.name,
        type: data.type,
        status: data.status as VehicleStatus,
        price_per_hour: data.price_per_hour,
        description: data.description || null,
        features: data.features ? JSON.stringify(data.features) : null,
        images: data.images ? JSON.stringify(data.images) : '[]',
        updated_at: new Date()
      })
      .where('id', '=', params.vehicleId)
      .returning([
        'id',
        'name',
        'type',
        'status',
        'price_per_hour',
        'description',
        'features',
        'images',
        'updated_at'
      ])
      .execute();

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    revalidatePath('/vehicles');
    revalidatePath('/admin/vehicles');

    return NextResponse.json(vehicle);
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getDb();

    // Check if vehicle has any active bookings
    const activeBookings = await db
      .selectFrom('bookings')
      .select(({ fn }) => [fn.count<number>('id').as('count')])
      .where('vehicle_id', '=', params.vehicleId)
      .where('status', 'not in', ['cancelled', 'completed'])
      .executeTakeFirst();

    if (activeBookings && activeBookings.count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vehicle with active bookings' },
        { status: 400 }
      );
    }

    // Delete vehicle
    const [deletedVehicle] = await db
      .deleteFrom('vehicles')
      .where('id', '=', params.vehicleId)
      .returning([
        'id',
        'name',
        'type',
        'status'
      ])
      .execute();

    if (!deletedVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    revalidatePath('/vehicles');
    revalidatePath('/admin/vehicles');

    return NextResponse.json(deletedVehicle);
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
} 