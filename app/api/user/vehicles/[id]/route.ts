import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated
    const user = await getCurrentUser(request.cookies);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vehicleId = params.id;
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { is_available } = body;

    if (typeof is_available !== 'boolean') {
      return NextResponse.json(
        { error: 'is_available must be a boolean' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // First check if the vehicle belongs to the user
      const vehicleResult = await client.query(`
        SELECT id
        FROM vehicles
        WHERE id = $1 AND owner_id = $2
      `, [vehicleId, user.id]);

      if (vehicleResult.rowCount === 0) {
        return NextResponse.json(
          { error: 'Vehicle not found or unauthorized' },
          { status: 404 }
        );
      }

      // Check if there are any active bookings for this vehicle
      if (!is_available) {
        const bookingsResult = await client.query(`
          SELECT COUNT(*) as count
          FROM bookings
          WHERE vehicle_id = $1
          AND status NOT IN ('completed', 'cancelled')
        `, [vehicleId]);

        if (bookingsResult.rows[0].count > 0) {
          return NextResponse.json(
            { error: 'Cannot mark vehicle as unavailable while it has active bookings' },
            { status: 400 }
          );
        }
      }

      // Update the vehicle availability
      const result = await client.query(`
        UPDATE vehicles
        SET is_available = $1
        WHERE id = $2 AND owner_id = $3
        RETURNING *
      `, [is_available, vehicleId, user.id]);

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
} 