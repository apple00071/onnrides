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
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.type || !data.price_per_hour || !data.location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Format location data
    let locationData: string;
    if (Array.isArray(data.location)) {
      locationData = JSON.stringify(data.location.map((loc: string) => loc.trim()).filter(Boolean));
    } else if (typeof data.location === 'string') {
      try {
        const parsed = JSON.parse(data.location);
        locationData = JSON.stringify(Array.isArray(parsed) ? parsed : [data.location]);
      } catch (e) {
        locationData = JSON.stringify([data.location]);
      }
    } else {
      locationData = JSON.stringify([String(data.location)]);
    }

    // Update vehicle using the db instance
    const [vehicle] = await db
      .updateTable('vehicles')
      .set({
        name: data.name,
        type: data.type,
        price_per_hour: Number(data.price_per_hour),
        price_7_days: data.price_7_days === null ? null : Number(data.price_7_days),
        price_15_days: data.price_15_days === null ? null : Number(data.price_15_days),
        price_30_days: data.price_30_days === null ? null : Number(data.price_30_days),
        location: locationData,
        images: data.images ? JSON.stringify(data.images) : '[]',
        is_available: Boolean(data.is_available),
        updated_at: new Date()
      })
      .where('id', '=', params.vehicleId)
      .returning([
        'id',
        'name',
        'type',
        'price_per_hour',
        'price_7_days',
        'price_15_days',
        'price_30_days',
        'location',
        'images',
        'is_available',
        'updated_at'
      ])
      .execute();

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Parse the location back to an array for the response
    const formattedVehicle = {
      ...vehicle,
      location: JSON.parse(vehicle.location),
      images: JSON.parse(vehicle.images)
    };

    revalidatePath('/vehicles');
    revalidatePath('/admin/vehicles');

    return NextResponse.json(formattedVehicle);
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