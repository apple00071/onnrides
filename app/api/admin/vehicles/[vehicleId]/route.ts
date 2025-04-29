import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import type { Vehicle, VehicleStatus } from '@/lib/schema';
import { revalidatePath } from 'next/cache';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vehicleId } = params;

    // Get vehicle details using query
    const result = await query(
      'SELECT * FROM vehicles WHERE id = $1',
      [vehicleId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    logger.info('Vehicle fetched successfully:', { vehicleId });

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vehicleId } = params;
    const body = await request.json();

    // Log the received data
    logger.info('Updating vehicle with data:', {
      vehicleId,
      body
    });

    // Validate required fields
    const requiredFields = ['name', 'type', 'location', 'price_per_hour'];
    const missingFields = requiredFields.filter(field => !body[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData = {
      name: body.name,
      type: body.type,
      location: Array.isArray(body.location) ? body.location.join(', ') : body.location,
      price_per_hour: Number(body.price_per_hour),
      min_booking_hours: body.min_booking_hours ? Number(body.min_booking_hours) : 1,
      quantity: body.quantity ? Number(body.quantity) : 1,
      price_7_days: body.price_7_days ? Number(body.price_7_days) : null,
      price_15_days: body.price_15_days ? Number(body.price_15_days) : null,
      price_30_days: body.price_30_days ? Number(body.price_30_days) : null,
      is_available: typeof body.is_available === 'boolean' ? body.is_available : true,
      images: body.images ? (Array.isArray(body.images) ? body.images : [body.images]) : [],
      status: ['active', 'maintenance', 'retired'].includes(body.status) ? body.status : 'active'
    };

    // Update the vehicle using Prisma
    const updatedVehicle = await prisma.vehicles.update({
      where: { id: vehicleId },
      data: {
        ...updateData,
        updated_at: new Date()
      }
    });

    // Revalidate the vehicles page
    revalidatePath('/admin/vehicles');
    revalidatePath('/vehicles');
    revalidatePath(`/vehicles/${vehicleId}`);

    logger.info('Vehicle updated successfully:', { vehicleId, updatedVehicle });

    return NextResponse.json({
      success: true,
      data: {
        vehicle: updatedVehicle
      }
    });
  } catch (error) {
    logger.error('Error updating vehicle:', {
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack
      } : error,
      vehicleId: params.vehicleId
    });

    if (error instanceof Error) {
      if (error.message.includes('Record to update not found')) {
        return NextResponse.json(
          { error: 'Vehicle not found' },
          { status: 404 }
        );
      }
      
      if (error.message.includes('invalid input syntax')) {
        return NextResponse.json(
          { error: 'Invalid data format provided' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: 'Failed to update vehicle',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check authentication and admin role
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vehicleId } = params;

    // Delete the vehicle using query
    const result = await query(
      'DELETE FROM vehicles WHERE id = $1 RETURNING id::text',
      [vehicleId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    logger.info('Vehicle deleted successfully:', { vehicleId });

    return NextResponse.json({
      success: true,
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