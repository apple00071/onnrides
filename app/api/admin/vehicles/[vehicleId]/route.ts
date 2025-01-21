import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vehicles, VEHICLE_STATUS } from '@/lib/schema';
import { eq } from 'drizzle-orm';
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
  request: Request,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Parse FormData
    const formData = await request.formData();
    
    // Get basic fields
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const location = JSON.parse(formData.get('location') as string);
    const price_per_hour = formData.get('price_per_hour') as string;
    const is_available = formData.get('is_available') === 'true';
    const rawStatus = formData.get('status') as string;
    const status = VEHICLE_STATUS.includes(rawStatus as any) ? rawStatus : 'active';
    const existingImages = JSON.parse(formData.get('existingImages') as string);

    // Handle file uploads
    const files = formData.getAll('images') as File[];
    const uploadPromises = files.map(async (file) => {
      // Generate unique filename
      const filename = `${nanoid()}-${file.name}`;
      
      // Upload to Vercel Blob
      const blob = await put(filename, file, {
        access: 'public',
      });

      return blob.url;
    });

    // Wait for all uploads to complete
    const newImageUrls = await Promise.all(uploadPromises);

    // Combine existing and new image URLs
    const allImages = [...existingImages, ...newImageUrls];

    // Validate required fields
    if (!name || !type || !price_per_hour || !location) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const vehicle = await db
      .update(vehicles)
      .set({
        name,
        type,
        price_per_hour: price_per_hour.toString(),
        location: Array.isArray(location) ? location.join(', ') : location,
        images: JSON.stringify(allImages),
        status: status as typeof VEHICLE_STATUS[number],
        is_available,
        updated_at: new Date().toISOString(),
      })
      .where(eq(vehicles.id, params.vehicleId))
      .returning();

    if (!vehicle || vehicle.length === 0) {
      return NextResponse.json(
        { message: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Vehicle updated successfully',
      vehicle: {
        ...vehicle[0],
        location: vehicle[0].location.split(', '),
        images: JSON.parse(vehicle[0].images)
      }
    });
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { message: 'Error updating vehicle' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const vehicle = await db
      .delete(vehicles)
      .where(eq(vehicles.id, params.vehicleId))
      .returning();

    if (!vehicle || vehicle.length === 0) {
      return NextResponse.json(
        { message: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Vehicle deleted successfully',
      vehicle: {
        ...vehicle[0],
        location: vehicle[0].location.split(', '),
        images: JSON.parse(vehicle[0].images)
      }
    });
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { message: 'Error deleting vehicle' },
      { status: 500 }
    );
  }
} 