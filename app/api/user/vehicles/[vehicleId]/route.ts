import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyAuth } from '@/app/lib/auth';
import logger from '@/lib/logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    // Check if user is authenticated
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const vehicleId = resolvedParams.vehicleId;
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

    // First check if the vehicle exists
    const vehicleResult = await query(
      `SELECT * FROM vehicles WHERE id = $1 LIMIT 1`,
      [vehicleId]
    );

    if (vehicleResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Check if there are any active bookings for this vehicle
    if (!is_available) {
      const activeBookingsResult = await query(
        `SELECT COUNT(*) as count FROM bookings 
         WHERE vehicle_id = $1 AND status NOT IN ('completed', 'cancelled')`,
        [vehicleId]
      );

      if (parseInt(activeBookingsResult.rows[0].count) > 0) {
        return NextResponse.json(
          { error: 'Cannot mark vehicle as unavailable while it has active bookings' },
          { status: 400 }
        );
      }
    }

    // Update the vehicle availability
    const updateResult = await query(
      `UPDATE vehicles SET is_available = $1 WHERE id = $2 RETURNING *`,
      [is_available, vehicleId]
    );

    return NextResponse.json(updateResult.rows[0]);
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}