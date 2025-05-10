import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

interface DeliveryVehicle {
  id: string;
  name: string;
  type: string;
  location: string;
  images: string;
  price_per_hour: number;
  price_7_days: number | null;
  price_15_days: number | null;
  price_30_days: number | null;
  is_available: boolean;
  quantity: number;
  [key: string]: any;
}

type Duration = '7' | '15' | '30';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const location = url.searchParams.get('location');
    const duration = (url.searchParams.get('duration') || '7') as Duration;

    // Validate duration is one of the allowed values
    if (!['7', '15', '30'].includes(duration)) {
      return NextResponse.json(
        { error: 'Invalid duration. Must be 7, 15, or 30 days.' },
        { status: 400 }
      );
    }

    logger.info('Fetching delivery vehicles with params:', {
      location,
      duration
    });

    // Get the appropriate price column based on duration
    const deliveryPriceColumn = `delivery_price_${duration}_days`;

    // Query focusing on available vehicles that are enabled for delivery partners
    const result = await query(`
      SELECT 
        id,
        name,
        type,
        location,
        images,
        price_per_hour,
        delivery_price_7_days,
        delivery_price_15_days,
        delivery_price_30_days,
        is_available,
        quantity,
        is_delivery_enabled
      FROM vehicles
      WHERE is_available = true
        AND quantity > 0
        AND is_delivery_enabled = true
        AND ${deliveryPriceColumn} IS NOT NULL
        ${location ? "AND location ? $1" : ""}
      ORDER BY ${deliveryPriceColumn} ASC
    `, location ? [location] : []);

    logger.info('Query executed successfully, processing results');

    // Process the results
    const vehicles = result.rows.map((vehicle: DeliveryVehicle) => {
      try {
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

        // Use delivery-specific pricing
        const deliveryPrice = vehicle[`delivery_price_${duration}_days`];
        if (!deliveryPrice) {
          logger.warn('Vehicle missing delivery price for duration:', {
            vehicleId: vehicle.id,
            duration
          });
          return null;
        }

        // Check which durations have delivery prices available
        const available_durations = ['7', '15', '30'].filter(d => 
          vehicle[`delivery_price_${d}_days`] !== null
        ).map(Number);

        return {
          ...vehicle,
          location: parsedLocation,
          images: parsedImages,
          price: deliveryPrice,
          duration: parseInt(duration),
          available_durations,
          is_delivery: true
        };
      } catch (error) {
        logger.error('Error processing vehicle data:', {
          vehicleId: vehicle.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
      }
    }).filter(Boolean);

    logger.info('Fetched delivery vehicles:', {
      count: vehicles.length,
      location,
      duration
    });

    return NextResponse.json(vehicles);
  } catch (error) {
    logger.error('Error fetching delivery vehicles:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Failed to fetch delivery vehicles' },
      { status: 500 }
     );
  }
} 