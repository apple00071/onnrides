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

    // Validate vehicle_category
    const validCategories = ['normal', 'delivery', 'both'];
    if (body.vehicle_category && !validCategories.includes(body.vehicle_category)) {
      return NextResponse.json(
        { error: 'Invalid vehicle category. Must be one of: normal, delivery, both' },
        { status: 400 }
      );
    }

    // Ensure location is an array
    if (!Array.isArray(body.location)) {
      return NextResponse.json(
        { error: 'Location must be an array' },
        { status: 400 }
      );
    }

    // Convert numeric fields
    const pricePerHour = Number(body.price_per_hour);
    if (isNaN(pricePerHour)) {
      return NextResponse.json(
        { error: 'Invalid price_per_hour value' },
        { status: 400 }
      );
    }

    const minBookingHours = body.min_booking_hours ? Number(body.min_booking_hours) : 1;
    const quantity = body.quantity ? Number(body.quantity) : 1;

    // Convert optional price fields
    const price7Days = body.price_7_days ? parseFloat(body.price_7_days) : null;
    const price15Days = body.price_15_days ? parseFloat(body.price_15_days) : null;
    const price30Days = body.price_30_days ? parseFloat(body.price_30_days) : null;

    // Update using raw query - only using fields that exist in the schema
    const result = await query(`
      UPDATE vehicles 
      SET 
        name = $1,
        type = $2,
        location = $3,
        quantity = $4,
        price_per_hour = $5,
        min_booking_hours = $6,
        is_available = $7,
        images = $8,
        status = $9,
        price_7_days = $10,
        price_15_days = $11,
        price_30_days = $12,
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      body.name,
      body.type,
      JSON.stringify(body.location), // Convert array to JSON string
      quantity,
      pricePerHour,
      minBookingHours,
      true,
      JSON.stringify(body.images), // Convert array to JSON string
      'active',
      price7Days,
      price15Days,
      price30Days,
      vehicleId
    ]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const updatedVehicle = result.rows[0];

    // Revalidate the vehicles page
    revalidatePath('/admin/vehicles');
    revalidatePath('/vehicles');
    revalidatePath(`/vehicles/${vehicleId}`);

    logger.info('Vehicle updated successfully:', { vehicleId, updatedVehicle });

    return NextResponse.json({
      success: true,
      data: updatedVehicle
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
          { error: 'Invalid data format provided', details: error.message },
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