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
    try {
      const isUserAdmin = await isAdmin();
      if (!isUserAdmin) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    } catch (authError) {
      logger.error('Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 500 }
      );
    }

    const { vehicleId } = params;
    let data;
    try {
      data = await request.json();
      logger.info('Updating vehicle with raw data:', { vehicleId, data });
    } catch (parseError) {
      logger.error('Error parsing request body:', parseError);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    // Parse numeric values with explicit type casting
    const price = Number(data.price_per_hour || data.pricePerHour || 0);
    const minHours = Number(data.min_booking_hours || data.minBookingHours || 1);
    const price7Days = data.price_7_days ? Number(data.price_7_days) : null;
    const price15Days = data.price_15_days ? Number(data.price_15_days) : null;
    const price30Days = data.price_30_days ? Number(data.price_30_days) : null;

    // Boolean and enum values
    const isAvailable = data.is_available !== undefined ? Boolean(data.is_available) : true;
    const status = data.status || 'active';

    try {
      // Query with explicit type casting to handle inconsistent column types
      const updateQuery = `
        UPDATE vehicles 
        SET 
          is_available = $1::boolean,
          price_per_hour = $2::numeric,
          min_booking_hours = $3::integer,
          price_7_days = $4::numeric,
          price_15_days = $5::numeric,
          price_30_days = $6::numeric,
          status = $7,
          updated_at = $8
        WHERE id = $9
        RETURNING *;
      `;

      const result = await query(updateQuery, [
        isAvailable,
        price,
        minHours,
        price7Days,
        price15Days,
        price30Days,
        status,
        new Date(),
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
    } catch (queryError) {
      logger.error('Database query error:', queryError);
      return NextResponse.json(
        { error: `Database error: ${queryError instanceof Error ? queryError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error) {
    logger.error('Unhandled error updating vehicle:', error);
    return NextResponse.json(
      { error: `Failed to update vehicle: ${error instanceof Error ? error.message : 'Unknown error'}` },
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

    // S2: Implement Vehicle Deletion Guard (Check active bookings)
    const activeBookings = await query(
      `SELECT COUNT(*) FROM bookings 
       WHERE vehicle_id = $1 AND status IN ('pending', 'confirmed', 'initiated', 'active')`,
      [vehicleId]
    );

    if (parseInt(activeBookings.rows[0].count) > 0) {
      return NextResponse.json({
        error: 'Cannot delete vehicle with active bookings. Cancel or complete all bookings first.'
      }, { status: 400 });
    }

    // Delete the vehicle using query
    const result = await query(
      'DELETE FROM vehicles WHERE id = $1 RETURNING id',
      [vehicleId]
    );

    if (result.rows.length === 0) {
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