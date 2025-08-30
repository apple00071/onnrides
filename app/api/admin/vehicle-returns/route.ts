import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 10;
    const offset = (page - 1) * limit;

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM vehicle_returns'
    );
    const totalItems = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalItems / limit);

    // Get vehicle returns with related data
    const returns = await query(
      `SELECT 
        vr.*,
        b.booking_id,
        v.name as vehicle_name,
        v.type as vehicle_type,
        u.name as user_name,
        u.email as user_email,
        admin.name as processed_by_name
      FROM vehicle_returns vr
      JOIN bookings b ON vr.booking_id = b.id
      JOIN vehicles v ON b.vehicle_id = v.id
      JOIN users u ON b.user_id = u.id
      LEFT JOIN users admin ON vr.processed_by = admin.id
      ORDER BY vr.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: returns.rows,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems,
        limit
      }
    });

  } catch (error) {
    logger.error('Error fetching vehicle returns:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch vehicle returns' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      booking_id,
      condition_notes,
      damages,
      additional_charges,
      odometer_reading,
      fuel_level,
      status
    } = body;

    // Validate required fields
    if (!booking_id) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Check if booking exists and is not already returned
    const bookingCheck = await query(
      `SELECT id, status, vehicle_id FROM bookings WHERE id = $1`,
      [booking_id]
    );

    if (bookingCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }

    if (bookingCheck.rows[0].status === 'completed') {
      return NextResponse.json(
        { success: false, error: 'Vehicle already returned for this booking' },
        { status: 400 }
      );
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Create vehicle return record
      const returnResult = await query(
        `INSERT INTO vehicle_returns (
          booking_id,
          condition_notes,
          damages,
          additional_charges,
          odometer_reading,
          fuel_level,
          status,
          processed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          booking_id,
          condition_notes,
          damages || [],
          additional_charges || 0,
          odometer_reading,
          fuel_level,
          status || 'pending',
          session.user.id
        ]
      );

      // Update booking status to completed
      await query(
        `UPDATE bookings 
        SET status = 'completed', updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1`,
        [booking_id]
      );

      // Update vehicle availability
      await query(
        `UPDATE vehicles 
        SET is_available = true, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1`,
        [bookingCheck.rows[0].vehicle_id]
      );

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        data: returnResult.rows[0]
      });

    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    logger.error('Error creating vehicle return:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create vehicle return' },
      { status: 500 }
    );
  }
} 