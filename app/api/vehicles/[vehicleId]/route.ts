import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface UpdateVehicleBody {
  name?: string;
  type?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  licensePlate?: string;
  seats?: number;
  transmission?: 'manual' | 'automatic';
  fuelType?: string;
  pricePerDay?: number;
  location?: string;
  images?: string[];
  isAvailable?: boolean;
}

// GET /api/vehicles/[vehicleId] - Get vehicle by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const resolvedParams = await params;
    logger.info('Fetching vehicle details:', { vehicleId: resolvedParams.vehicleId });

    const result = await query(`
      SELECT
        id,
        name,
        type,
        location,
        price_per_hour,
        price_7_days,
        price_15_days,
        price_30_days,
        images,
        created_at,
        updated_at
      FROM vehicles
      WHERE id = $1 AND is_available = true
    `, [resolvedParams.vehicleId]);

    if (result.rowCount === 0) {
      logger.warn('Vehicle not found:', { vehicleId: resolvedParams.vehicleId });
      return new NextResponse(
        JSON.stringify({ error: 'Vehicle not found' }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Log the raw data from the database for debugging
    logger.debug('Raw vehicle data from database:', {
      id: result.rows[0].id,
      name: result.rows[0].name,
      imagesType: typeof result.rows[0].images,
      imagesPreview: result.rows[0].images ?
        (typeof result.rows[0].images === 'string' ?
          result.rows[0].images.substring(0, 50) + '...' :
          JSON.stringify(result.rows[0].images).substring(0, 50) + '...') :
        'null',
      locationPreview: result.rows[0].location ?
        (typeof result.rows[0].location === 'string' ?
          result.rows[0].location.substring(0, 50) + '...' :
          JSON.stringify(result.rows[0].location).substring(0, 50) + '...') :
        'null'
    });

    const { parseLocations, parseImages } = require('@/lib/utils/data-normalization');
    const parsedLocation = parseLocations(result.rows[0].location);
    const parsedImages = parseImages(result.rows[0].images);

    // Create the final vehicle object with parsed fields
    const vehicle = {
      ...result.rows[0],
      location: parsedLocation,
      images: parsedImages
    };

    // Log the processed vehicle data
    logger.info('Processed vehicle data for response:', {
      id: vehicle.id,
      name: vehicle.name,
      hasImages: Array.isArray(vehicle.images) && vehicle.images.length > 0,
      imageCount: Array.isArray(vehicle.images) ? vehicle.images.length : 0,
      locationsFormatted: JSON.stringify(vehicle.location),
      firstImagePreview: Array.isArray(vehicle.images) && vehicle.images.length > 0
        ? (typeof vehicle.images[0] === 'string'
          ? vehicle.images[0].substring(0, 50) + '...'
          : JSON.stringify(vehicle.images[0]).substring(0, 50) + '...')
        : 'No images'
    });

    return new NextResponse(
      JSON.stringify(vehicle),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    logger.error('Error fetching vehicle:', error instanceof Error ? {
      message: error.message,
      stack: error.stack
    } : error);

    return new NextResponse(
      JSON.stringify({
        error: 'Failed to fetch vehicle',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

// PUT /api/vehicles/[vehicleId] - Update vehicle
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const body = await request.json();
    const {
      name,
      type,
      location,
      quantity,
      price_per_hour,
      min_booking_hours,
      is_available,
      images,
      status,
      vehicle_category,
      price_7_days,
      price_15_days,
      price_30_days,
      delivery_price_7_days,
      delivery_price_15_days,
      delivery_price_30_days,
    } = body;

    // Update vehicle using raw SQL query
    const updatedVehicle = await query(`
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
        vehicle_category = $10,
        price_7_days = $11,
        price_15_days = $12,
        price_30_days = $13,
        delivery_price_7_days = $14,
        delivery_price_15_days = $15,
        delivery_price_30_days = $16,
        updated_at = $17
      WHERE id = $18
      RETURNING *
    `, [
      name,
      type,
      location,
      quantity,
      price_per_hour,
      min_booking_hours,
      is_available,
      images ? JSON.stringify(images) : null,
      status,
      vehicle_category,
      price_7_days,
      price_15_days,
      price_30_days,
      delivery_price_7_days,
      delivery_price_15_days,
      delivery_price_30_days,
      new Date(),
      resolvedParams.vehicleId
    ]);

    if (updatedVehicle.rowCount === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedVehicle.rows[0]);
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

// DELETE /api/vehicles/[vehicleId] - Delete vehicle
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;

    // Check for active bookings
    const bookingsResult = await query(`
      SELECT COUNT(*) FROM bookings
      WHERE vehicle_id = $1
      AND status IN ('pending', 'confirmed', 'active')
    `, [resolvedParams.vehicleId]);

    if (parseInt(bookingsResult.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vehicle with active bookings' },
        { status: 400 }
      );
    }

    // Delete the vehicle
    const result = await query(`
      DELETE FROM vehicles
      WHERE id = $1
      RETURNING *
    `, [resolvedParams.vehicleId]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
} 