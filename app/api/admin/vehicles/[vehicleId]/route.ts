import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vehicles, VEHICLE_STATUS } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';
import logger from '@/lib/logger';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';
import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';

export async function GET(
  request: Request,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const vehicle = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, params.vehicleId));

    if (!vehicle || vehicle.length === 0) {
      return NextResponse.json(
        { message: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Vehicle fetched successfully',
      vehicle: {
        ...vehicle[0],
        location: vehicle[0].location.split(', '),
        images: JSON.parse(vehicle[0].images)
      }
    });
  } catch (error) {
    logger.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { message: 'Error fetching vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { vehicleId } = params;
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      type,
      location,
      quantity,
      price_per_hour,
      min_booking_hours,
      images,
      is_available,
      status
    } = body;

    // Update vehicle
    const [vehicle] = await db
      .update(vehicles)
      .set({
        ...(name && { name }),
        ...(type && { type }),
        ...(location && { location: JSON.stringify(location) }),
        ...(quantity && { quantity }),
        ...(price_per_hour && { price_per_hour: price_per_hour.toString() }),
        ...(min_booking_hours && { min_booking_hours }),
        ...(images && { images: JSON.stringify(images) }),
        ...(is_available !== undefined && { is_available }),
        ...(status && { status }),
        updated_at: sql`strftime('%s', 'now')`
      })
      .where(eq(vehicles.id, vehicleId))
      .returning();

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Vehicle updated successfully',
      vehicle: {
        ...vehicle,
        location: JSON.parse(vehicle.location),
        images: JSON.parse(vehicle.images)
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
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { vehicleId } = params;
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    const [vehicle] = await db
      .delete(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .returning();

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
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