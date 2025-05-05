import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const { vehicleId } = params;
    const url = new URL(request.url);
    const duration = url.searchParams.get('duration') || '7';

    // Fetch vehicle details
    const result = await query(`
      SELECT 
        v.id,
        v.name,
        v.type,
        v.location,
        v.images,
        v.delivery_price_7_days,
        v.delivery_price_15_days,
        v.delivery_price_30_days,
        v.vehicle_category,
        v.is_available
      FROM vehicles v
      WHERE v.id = $1
      AND v.status = 'active'
      AND (v.vehicle_category = 'delivery' OR v.vehicle_category = 'both')
    `, [vehicleId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const vehicle = result.rows[0];

    // Parse location and images
    let parsedLocation = [];
    let parsedImages = [];

    try {
      parsedLocation = typeof vehicle.location === 'string' ? 
        JSON.parse(vehicle.location) : 
        Array.isArray(vehicle.location) ? 
          vehicle.location : [];
    } catch (e) {
      parsedLocation = vehicle.location ? [vehicle.location] : [];
    }

    try {
      parsedImages = typeof vehicle.images === 'string' ? 
        JSON.parse(vehicle.images) : 
        Array.isArray(vehicle.images) ? 
          vehicle.images : [];
    } catch (e) {
      parsedImages = vehicle.images ? [vehicle.images] : [];
    }

    // Format response
    const formattedVehicle = {
      ...vehicle,
      location: parsedLocation,
      images: parsedImages,
      duration: parseInt(duration)
    };

    return NextResponse.json(formattedVehicle);
  } catch (error) {
    logger.error('Error fetching delivery vehicle:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to fetch vehicle details' },
      { status: 500 }
    );
  }
} 