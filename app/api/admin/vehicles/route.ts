import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import logger from '@/lib/logger';
import { verifyAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await verifyAuth();
    
    if (!user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
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
      vehicles: allVehicles
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
    if (!data.name || !data.type || !data.price_per_day || !data.location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Insert new vehicle
    await db.insert(vehicles).values({
      name: data.name,
      type: data.type,
      quantity: data.quantity || 1,
      price_per_day: data.price_per_day,
      location: data.location,
      images: data.images || [],
      is_available: data.is_available ?? true,
      status: data.status || 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    return NextResponse.json({ message: 'Vehicle created successfully' });
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
    logger.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
} 