import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { put } from '@vercel/blob';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/lib/logger';

export async function POST(
  request: Request,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const images = formData.getAll('images[]') as File[];

    if (!images.length) {
      return NextResponse.json({ error: 'No images provided' }, { status: 400 });
    }

    // Get current vehicle to access existing images
    const currentVehicle = await prisma.vehicles.findUnique({
      where: { id: params.vehicleId }
    });

    if (!currentVehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Parse existing images
    const existingImages = currentVehicle.images ? 
      (typeof currentVehicle.images === 'string' ? 
        JSON.parse(currentVehicle.images) : 
        currentVehicle.images) : 
      [];

    // Upload new images to Vercel Blob storage
    const uploadedImages = await Promise.all(
      images.map(async (image) => {
        const blob = await put(`vehicles/${params.vehicleId}/${uuidv4()}-${image.name}`, image, {
          access: 'public',
        });
        return blob.url;
      })
    );

    // Combine existing and new images
    const allImages = [...existingImages, ...uploadedImages];

    // Update vehicle with all images
    const vehicle = await prisma.vehicles.update({
      where: { id: params.vehicleId },
      data: {
        images: JSON.stringify(allImages)
      },
    });

    // Parse images for response
    const responseVehicle = {
      ...vehicle,
      images: typeof vehicle.images === 'string' ? JSON.parse(vehicle.images) : vehicle.images
    };

    return NextResponse.json({ 
      success: true, 
      vehicle: responseVehicle 
    });
  } catch (error) {
    logger.error('Error uploading vehicle images:', error);
    return NextResponse.json(
      { error: 'Failed to upload images' },
      { status: 500 }
    );
  }
} 