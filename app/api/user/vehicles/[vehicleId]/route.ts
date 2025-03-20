import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAuth } from '@/app/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check if user is authenticated
    const user = await verifyAuth();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vehicleId = params.vehicleId;
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
    const vehicle = await db
      .selectFrom('vehicles')
      .selectAll()
      .where('id', '=', vehicleId)
      .limit(1)
      .execute();

    if (!vehicle || vehicle.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Check if there are any active bookings for this vehicle
    if (!is_available) {
      const activeBookings = await db
        .selectFrom('bookings')
        .select(db.fn.count<number>('id').as('count'))
        .where('vehicle_id', '=', vehicleId)
        .where('status', 'not in', ['completed', 'cancelled'])
        .execute();

      if (activeBookings[0].count > 0) {
        return NextResponse.json(
          { error: 'Cannot mark vehicle as unavailable while it has active bookings' },
          { status: 400 }
        );
      }
    }

    // Update the vehicle availability
    const [updatedVehicle] = await db
      .updateTable('vehicles')
      .set({ is_available })
      .where('id', '=', vehicleId)
      .returningAll()
      .execute();

    return NextResponse.json(updatedVehicle);
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}