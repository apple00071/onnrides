import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

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
  { params }: { params: { vehicleId: string } }
) {
  try {
    logger.info('Fetching vehicle details:', { vehicleId: params.vehicleId });
    
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
      WHERE id = $1
    `, [params.vehicleId]);

    if (result.rowCount === 0) {
      logger.warn('Vehicle not found:', { vehicleId: params.vehicleId });
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
      imagesPreview: result.rows[0].images ? result.rows[0].images.substring(0, 50) + '...' : 'null',
      locationPreview: result.rows[0].location ? result.rows[0].location.substring(0, 50) + '...' : 'null'
    });

    // Safely parse JSON fields with error handling
    let parsedLocation = [];
    let parsedImages = [];
    
    try {
      // Parse location - could be a JSON string or a plain string
      if (result.rows[0].location) {
        if (typeof result.rows[0].location === 'string') {
          try {
            parsedLocation = JSON.parse(result.rows[0].location);
          } catch (e) {
            // If parsing fails, treat it as a plain string and wrap in array
            parsedLocation = [result.rows[0].location];
            logger.warn('Location is not valid JSON, using as plain string:', { 
              location: result.rows[0].location
            });
          }
        } else {
          // If it's already an object (not a string), use it directly
          parsedLocation = result.rows[0].location;
        }
      }
      
      // Parse images - could be a JSON string array or a plain URL string
      if (result.rows[0].images) {
        if (typeof result.rows[0].images === 'string') {
          // Check if it's already a direct image URL
          if (result.rows[0].images.startsWith('http') || result.rows[0].images.startsWith('data:image')) {
            parsedImages = [result.rows[0].images];
            logger.info('Images field is a direct URL, converting to array');
          } else {
            try {
              parsedImages = JSON.parse(result.rows[0].images);
              logger.info('Successfully parsed images JSON', {
                count: Array.isArray(parsedImages) ? parsedImages.length : 'not an array'
              });
            } catch (e) {
              // If parsing fails, use it as a single image URL
              parsedImages = [result.rows[0].images];
              logger.warn('Images field is not valid JSON, using as a single image URL');
            }
          }
        } else if (Array.isArray(result.rows[0].images)) {
          // If it's already an array, use it directly
          parsedImages = result.rows[0].images;
        }
      }
    } catch (error) {
      logger.error('Error parsing JSON fields:', error);
      // In case of any error, provide empty arrays as fallback
      if (!parsedLocation.length) parsedLocation = [];
      if (!parsedImages.length) parsedImages = [];
    }

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
      firstImagePreview: Array.isArray(vehicle.images) && vehicle.images.length > 0 
        ? (vehicle.images[0].substring(0, 50) + '...') 
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
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    // Update vehicle using Prisma
    const updatedVehicle = await prisma.vehicles.update({
      where: {
        id: params.vehicleId,
      },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(location && { location }),
        ...(typeof quantity === 'number' && { quantity }),
        ...(typeof price_per_hour === 'number' && { price_per_hour }),
        ...(typeof min_booking_hours === 'number' && { min_booking_hours }),
        ...(typeof is_available === 'boolean' && { is_available }),
        ...(images && { images: JSON.stringify(images) }),
        ...(status && { status }),
        ...(vehicle_category && { vehicle_category }),
        ...(typeof price_7_days === 'number' && { price_7_days }),
        ...(typeof price_15_days === 'number' && { price_15_days }),
        ...(typeof price_30_days === 'number' && { price_30_days }),
        ...(typeof delivery_price_7_days === 'number' && { delivery_price_7_days }),
        ...(typeof delivery_price_15_days === 'number' && { delivery_price_15_days }),
        ...(typeof delivery_price_30_days === 'number' && { delivery_price_30_days }),
        updated_at: new Date(),
      },
    });

    return NextResponse.json(updatedVehicle);
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
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for active bookings
    const bookingsResult = await query(`
      SELECT COUNT(*) FROM bookings 
      WHERE vehicle_id = $1 
      AND status IN ('pending', 'confirmed', 'active')
    `, [params.vehicleId]);

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
    `, [params.vehicleId]);

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