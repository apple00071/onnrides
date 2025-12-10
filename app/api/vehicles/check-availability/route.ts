import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { vehicleId, location, startDate, endDate } = await request.json();

    // Validate required parameters
    if (!vehicleId || !location || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Get vehicle details with location-specific quantities
    const vehicle = await query(`
      SELECT quantity, location_quantities
      FROM vehicles
      WHERE id = $1
    `, [vehicleId]);

    if (vehicle.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Get location-specific quantity (fallback to global quantity for backward compatibility)
    const vehicleData = vehicle.rows[0];
    const locationQuantities = vehicleData.location_quantities || {};
    const locationQty = locationQuantities[location] || vehicleData.quantity || 0;

    logger.info('Availability check', {
      vehicleId,
      location,
      locationQuantities,
      locationQty,
      fallbackToGlobal: !locationQuantities[location]
    });

    // Count overlapping bookings at this specific location
    const overlappingBookings = await query(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE vehicle_id = $1
      AND (
        trim(both '"' from pickup_location::text) = $2
        OR pickup_location IS NULL
        OR trim(both '"' from pickup_location::text) = ''
        OR pickup_location::text = 'null'
        OR pickup_location::text ILIKE '%"' || $2 || '"%'
      )
      AND status NOT IN ('cancelled', 'failed')
      AND (payment_status IS NULL OR payment_status != 'failed')
      AND (
        (start_date - interval '2 hours', end_date + interval '2 hours') OVERLAPS ($3::timestamptz, $4::timestamptz)
        OR ($3::timestamptz BETWEEN (start_date - interval '2 hours') AND (end_date + interval '2 hours'))
        OR ($4::timestamptz BETWEEN (start_date - interval '2 hours') AND (end_date + interval '2 hours'))
      )
    `, [vehicleId, location, startDate, endDate]);

    const count = Number((overlappingBookings.rows[0] as any).count);
    const isAvailable = count < locationQty;

    logger.info('Availability result', {
      vehicleId,
      location,
      overlappingCount: count,
      locationQuantity: locationQty,
      isAvailable
    });

    return NextResponse.json({
      available: isAvailable,
      details: {
        overlappingBookings: count,
        locationQuantity: locationQty,
        remainingSlots: Math.max(0, locationQty - count)
      }
    });
  } catch (error) {
    logger.error('Error checking vehicle availability:', error);
    return NextResponse.json(
      { error: 'Failed to check vehicle availability' },
      { status: 500 }
    );
  }
} 