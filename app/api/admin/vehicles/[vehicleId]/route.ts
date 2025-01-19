import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { vehicles, bookings } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vehicleId } = params;
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { is_available } = body;

    if (typeof is_available !== 'boolean') {
      return NextResponse.json(
        { error: 'is_available must be a boolean' },
        { status: 400 }
      );
    }

    // Update vehicle availability
    await db
      .update(vehicles)
      .set({
        is_available,
        updated_at: new Date()
      })
      .where(eq(vehicles.id, vehicleId));

    return NextResponse.json({
      success: true,
      message: 'Vehicle availability updated successfully'
    });
  } catch (error) {
    logger.error('Error updating vehicle availability:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle availability' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vehicleId } = params;
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    // First check if there are any active bookings for this vehicle
    const bookingsCount = await db
      .select({
        count: sql<number>`count(*)`
      })
      .from(bookings)
      .where(
        sql`${bookings.vehicle_id} = ${vehicleId} AND ${bookings.status} = 'active'`
      );

    if (bookingsCount[0].count > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vehicle with active bookings' },
        { status: 400 }
      );
    }

    // Delete the vehicle
    await db
      .delete(vehicles)
      .where(eq(vehicles.id, vehicleId));

    return NextResponse.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Verify authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const vehicleId = params.vehicleId;
    const data = await request.json();

    // Validate required fields
    const requiredFields = ['name', 'type', 'location', 'quantity', 'price_per_day'];
    const missingFields = requiredFields.filter(field => !data[field]);
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Update vehicle with proper type conversions
    const [updatedVehicle] = await db
      .update(vehicles)
      .set({
        name: data.name,
        type: data.type,
        location: Array.isArray(data.location.name) 
          ? JSON.stringify(data.location.name)
          : JSON.stringify([data.location.name]),
        quantity: Number(data.quantity),
        price_per_day: String(data.price_per_day),
        price_12hrs: String(data.price_12hrs || 0),
        price_24hrs: String(data.price_24hrs || 0),
        price_7days: String(data.price_7days || 0),
        price_15days: String(data.price_15days || 0),
        price_30days: String(data.price_30days || 0),
        min_booking_hours: Number(data.min_booking_hours || 1),
        is_available: Boolean(data.is_available),
        status: data.status,
        updated_at: new Date()
      })
      .where(eq(vehicles.id, vehicleId))
      .returning();

    if (!updatedVehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Parse the location before sending response
    const parsedLocation = (() => {
      try {
        return JSON.parse(updatedVehicle.location as string);
      } catch (e) {
        return [updatedVehicle.location];
      }
    })();

    return NextResponse.json({
      success: true,
      message: 'Vehicle updated successfully',
      vehicle: {
        ...updatedVehicle,
        location: parsedLocation,
        price_per_day: Number(updatedVehicle.price_per_day),
        price_12hrs: Number(updatedVehicle.price_12hrs),
        price_24hrs: Number(updatedVehicle.price_24hrs),
        price_7days: Number(updatedVehicle.price_7days),
        price_15days: Number(updatedVehicle.price_15days),
        price_30days: Number(updatedVehicle.price_30days)
      }
    });
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 