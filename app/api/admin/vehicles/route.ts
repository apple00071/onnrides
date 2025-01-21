import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';

export async function GET() {
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

    const allVehicles = await db
      .select()
      .from(vehicles)
      .orderBy(desc(vehicles.created_at));

    return NextResponse.json({
      message: 'Vehicles fetched successfully',
      vehicles: allVehicles.map(vehicle => ({
        ...vehicle,
        location: vehicle.location.split(', '),
        images: JSON.parse(vehicle.images || '[]')
      }))
    });
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { message: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const data = await request.json();
    logger.debug('Received vehicle data:', data);

    // Validate required fields
    if (!data.name || !data.type || !data.price_per_hour || !data.location) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    // Insert new vehicle
    const [newVehicle] = await db.insert(vehicles).values({
      id: randomUUID(),
      name: data.name,
      type: data.type,
      location: Array.isArray(data.location) ? data.location.join(', ') : data.location,
      quantity: data.quantity || 1,
      price_per_hour: String(data.price_per_hour),
      min_booking_hours: data.min_booking_hours || 12,
      images: JSON.stringify(data.images || []),
      is_available: data.is_available ?? true,
      status: data.status || 'active',
      created_at: now,
      updated_at: now,
    }).returning();

    logger.debug('Created vehicle:', newVehicle);

    return NextResponse.json({
      message: 'Vehicle created successfully',
      vehicle: {
        ...newVehicle,
        location: newVehicle.location.split(', '),
        images: JSON.parse(newVehicle.images || '[]')
      }
    });
  } catch (error) {
    logger.error('Error creating vehicle:', error);
    return NextResponse.json(
      { message: 'Failed to create vehicle', error: error instanceof Error ? error.message : 'Unknown error' },
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