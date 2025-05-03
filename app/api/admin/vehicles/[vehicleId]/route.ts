import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import type { Vehicle, VehicleStatus } from '@/lib/schema';
import { revalidatePath } from 'next/cache';

async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === 'admin';
}

export async function GET(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check if user is admin
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vehicleId } = params;

    // Get vehicle from database
    const result = await query(`
      SELECT * FROM vehicles 
      WHERE id = $1
    `, [vehicleId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    logger.info('Vehicle fetched successfully:', { vehicleId });

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check if user is admin
    const isUserAdmin = await isAdmin();
    if (!isUserAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vehicleId } = params;
    const data = await request.json();

    // Update vehicle in database
    const result = await query(`
      UPDATE vehicles 
      SET 
        name = $1,
        type = $2,
        location = $3,
        "pricePerHour" = $4,
        "isAvailable" = $5,
        images = $6,
        "updatedAt" = NOW()
      WHERE id = $7
      RETURNING *
    `, [
      data.name,
      data.type,
      data.location,
      data.price_per_hour,
      data.is_available,
      data.images ? data.images.join(',') : null,
      vehicleId
    ]);

    if (result.rows.length === 0) {
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
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update vehicle' },
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