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

    // Get vehicle details
    const vehicle = await query(`
      SELECT quantity
      FROM vehicles
      WHERE id = $1
    `, [vehicleId]);

    if (vehicle.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Count overlapping bookings
    const overlappingBookings = await query(`
      SELECT COUNT(*) as count
      FROM bookings
      WHERE vehicle_id = $1
      AND location = $2
      AND status NOT IN ('cancelled', 'failed')
      AND (
        (start_date, end_date) OVERLAPS ($3::timestamp, $4::timestamp)
        OR $3::timestamp BETWEEN start_date AND end_date
        OR $4::timestamp BETWEEN start_date AND end_date
        OR start_date BETWEEN $3::timestamp AND $4::timestamp
        OR end_date BETWEEN $3::timestamp AND $4::timestamp
      )
    `, [vehicleId, location, startDate, endDate]);

    const count = Number((overlappingBookings.rows[0] as any).count);
    const isAvailable = count < Number(vehicle.rows[0].quantity);

    return NextResponse.json({ available: isAvailable });
  } catch (error) {
    logger.error('Error checking vehicle availability:', error);
    return NextResponse.json(
      { error: 'Failed to check vehicle availability' },
      { status: 500 }
    );
  }
} 