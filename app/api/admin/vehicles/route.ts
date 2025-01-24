import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/db/schema';
import { eq, desc, sql } from 'drizzle-orm';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';
import { nanoid } from 'nanoid';
import { verifyAuth } from '@/lib/auth';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
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

    // Get all vehicles
    const allVehicles = await db
      .select()
      .from(vehicles)
      .orderBy(desc(vehicles.created_at));

    // Parse JSON strings back to objects safely
    const formattedVehicles = allVehicles.map(vehicle => {
      let parsedLocation;
      let parsedImages;

      try {
        parsedLocation = JSON.parse(vehicle.location);
      } catch (e) {
        // If parsing fails, treat it as a single location string
        parsedLocation = [vehicle.location];
      }

      try {
        parsedImages = JSON.parse(vehicle.images);
      } catch (e) {
        parsedImages = vehicle.images ? [vehicle.images] : [];
      }

      return {
        ...vehicle,
        location: parsedLocation,
        images: parsedImages,
      };
    });

    return NextResponse.json({
      vehicles: formattedVehicles
    });
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      name,
      type,
      location,
      quantity = 1,
      price_per_hour,
      min_booking_hours = 12,
      images,
    } = body;

    // Validate required fields
    if (!name || !type || !location || !price_per_hour || !images) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure location is properly formatted
    const locationJson = Array.isArray(location) 
      ? JSON.stringify(location)
      : JSON.stringify([location]);

    // Ensure images is properly formatted
    const imagesJson = Array.isArray(images)
      ? JSON.stringify(images)
      : JSON.stringify([images]);

    // Create vehicle
    const [vehicle] = await db
      .insert(vehicles)
      .values({
        id: crypto.randomUUID(),
        name,
        type,
        location: locationJson,
        quantity,
        price_per_hour: price_per_hour.toString(),
        min_booking_hours,
        images: imagesJson,
        is_available: true,
        status: 'active',
        created_at: sql`strftime('%s', 'now')`,
        updated_at: sql`strftime('%s', 'now')`
      })
      .returning();

    return NextResponse.json({
      message: 'Vehicle created successfully',
      vehicle: {
        ...vehicle,
        location: JSON.parse(vehicle.location),
        images: JSON.parse(vehicle.images)
      }
    });
  } catch (error) {
    logger.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
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

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { message: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    // Delete vehicle
    await db.delete(vehicles).where(eq(vehicles.id, id));

    return NextResponse.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { message: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
} 