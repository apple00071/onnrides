import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const { vehicleId, location, startDate, endDate } = await request.json();

    logger.info('Checking availability:', {
      vehicleId,
      location,
      startDate,
      endDate
    });

    if (!vehicleId || !location || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Check for existing bookings
    const result = await query(`
      SELECT COUNT(*) as booking_count, v.quantity
      FROM bookings b
      JOIN vehicles v ON b.vehicle_id = v.id
      WHERE b.vehicle_id = $1
      AND b.pickup_location = $2
      AND b.status NOT IN ('cancelled', 'failed')
      AND b.payment_status != 'failed'
      AND (
        ($3::timestamp, $4::timestamp) OVERLAPS (b.start_date, b.end_date)
        OR b.start_date BETWEEN $3::timestamp AND $4::timestamp
        OR b.end_date BETWEEN $3::timestamp AND $4::timestamp
        OR ($3::timestamp BETWEEN b.start_date AND b.end_date)
        OR ($4::timestamp BETWEEN b.start_date AND b.end_date)
      )
      GROUP BY v.quantity
    `, [vehicleId, location, startDate, endDate]);

    logger.info('Availability check result:', {
      location,
      rowCount: result.rowCount,
      rows: result.rows
    });

    // If no bookings found, vehicle is available
    if (result.rows.length === 0) {
      return NextResponse.json({ available: true });
    }

    // Check if number of bookings is less than vehicle quantity
    const { booking_count, quantity } = result.rows[0];
    const available = booking_count < quantity;

    logger.info('Availability status:', {
      location,
      booking_count,
      quantity,
      available
    });

    return NextResponse.json({ available });
  } catch (error) {
    logger.error('Error checking availability:', error);
    return NextResponse.json(
      { error: 'Failed to check availability' },
      { status: 500 }
    );
  }
} 