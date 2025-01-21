import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';
import { nanoid } from 'nanoid';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const allVehicles = await db.select().from(vehicles);

    return NextResponse.json({
      message: 'Vehicles fetched successfully',
      vehicles: allVehicles.map(vehicle => {
        // Parse images
        let images = [];
        try {
          if (typeof vehicle.images === 'string') {
            images = vehicle.images.startsWith('[') ? JSON.parse(vehicle.images) : [vehicle.images];
          } else if (Array.isArray(vehicle.images)) {
            images = vehicle.images;
          }
        } catch (error) {
          logger.error('Error parsing vehicle images:', error);
          images = [];
        }

        return {
          ...vehicle,
          location: vehicle.location.split(', '),
          images
        };
      })
    });
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { message: 'Error fetching vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { name, type, price_per_hour, location, images, quantity = 1 } = data;

    const vehicle = await db.insert(vehicles).values({
      id: nanoid(),
      name,
      type,
      price_per_hour: price_per_hour.toString(),
      location: Array.isArray(location) ? location.join(', ') : location,
      images: JSON.stringify(images),
      quantity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    return NextResponse.json({
      message: 'Vehicle created successfully',
      vehicle,
    });
  } catch (error) {
    logger.error('Error creating vehicle:', error);
    return NextResponse.json(
      { message: 'Error creating vehicle' },
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