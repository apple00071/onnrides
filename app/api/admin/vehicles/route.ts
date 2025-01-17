import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all vehicles
    const allVehicles = await db
      .select({
        id: vehicles.id,
        name: vehicles.name,
        type: vehicles.type,
        quantity: vehicles.quantity,
        price_per_day: vehicles.price_per_day,
        location: vehicles.location,
        images: vehicles.images,
        created_at: vehicles.created_at,
        updated_at: vehicles.updated_at,
      })
      .from(vehicles);

    return NextResponse.json({ vehicles: allVehicles });
  } catch (error) {
    logger.error('Failed to fetch vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.type || !data.price_per_day) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert new vehicle
    const result = await db.insert(vehicles).values({
      name: data.name,
      type: data.type,
      quantity: data.quantity || 1,
      price_per_day: data.price_per_day,
      location: data.location || {},
      images: data.images || [],
      created_at: new Date(),
      updated_at: new Date(),
    });

    return NextResponse.json({ message: 'Vehicle created successfully' });
  } catch (error) {
    logger.error('Failed to create vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    // Delete vehicle
    await db.delete(vehicles).where(eq(vehicles.id, id));

    return NextResponse.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
} 