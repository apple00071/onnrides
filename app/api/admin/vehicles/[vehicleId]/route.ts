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
    if (!data.name || !data.type || !data.price_per_hour || !data.location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Format location data
    let locationData;
    if (Array.isArray(data.location)) {
      locationData = JSON.stringify(data.location.map(loc => loc.trim()).filter(Boolean));
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

    const db = getDb();

    // Update vehicle
    const [vehicle] = await db
      .updateTable('vehicles')
      .set({
        name: data.name,
        type: data.type,
        price_per_hour: data.price_per_hour,
        location: locationData,
        images: data.images ? JSON.stringify(data.images) : '[]',
        updated_at: new Date()
      })
      .where('id', '=', params.vehicleId)
      .returning([
        'id',
        'name',
        'type',
        'price_per_hour',
        'location',
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
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const db = getDb();
    logger.info('Attempting to delete vehicle:', { vehicleId: params.vehicleId });

    try {
      // Check if vehicle exists before deleting
      const [existingVehicle] = await db
        .selectFrom('vehicles')
        .selectAll()
        .where('id', '=', params.vehicleId)
        .execute();

      logger.info('Vehicle existence check:', { exists: !!existingVehicle });

      if (!existingVehicle) {
        return NextResponse.json(
          { error: 'Vehicle not found' },
          { status: 404 }
        );
      }

      // Check if vehicle has any confirmed bookings
      const [confirmedBooking] = await db
        .selectFrom('bookings')
        .selectAll()
        .where('vehicle_id', '=', params.vehicleId)
        .where('status', '=', 'confirmed' as const)
        .execute();

      logger.info('Confirmed bookings check:', { hasConfirmedBooking: !!confirmedBooking });

      if (confirmedBooking) {
        return NextResponse.json(
          { error: 'Cannot delete vehicle with confirmed bookings' },
          { status: 400 }
        );
      }

      // First, delete any pending bookings
      await db
        .deleteFrom('bookings')
        .where('vehicle_id', '=', params.vehicleId)
        .where('status', '=', 'pending' as const)
        .execute();

      logger.info('Deleted pending bookings');

      // Then delete the vehicle
      await db
        .deleteFrom('vehicles')
        .where('id', '=', params.vehicleId)
        .execute();

      logger.info('Vehicle deleted successfully');

      revalidatePath('/vehicles');
      revalidatePath('/admin/vehicles');

      return NextResponse.json({ success: true });
    } catch (dbError: any) {
      logger.error('Database operation failed:', dbError);
      throw new Error(`Database operation failed: ${dbError?.message || 'Unknown database error'}`);
    }
  } catch (error: any) {
    logger.error('Error deleting vehicle:', {
      error,
      message: error?.message || 'Unknown error',
      stack: error?.stack,
      vehicleId: params.vehicleId
    });
    
    return NextResponse.json(
      { error: `Failed to delete vehicle: ${error?.message || 'Unknown error'}` },
      { status: 500 }
    );
  }
} 