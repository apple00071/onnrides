import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import logger from '@/lib/logger';

export async function GET(
  _request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const result = await query(
      'SELECT * FROM vehicles WHERE id = $1',
      [params.vehicleId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();

    // Validate required fields
    if (!data.name || !data.type || !data.status || !data.price_per_day) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Update vehicle
    const result = await query(
      `UPDATE vehicles 
       SET name = $1, 
           type = $2, 
           status = $3, 
           price_per_day = $4, 
           description = $5, 
           features = $6, 
           images = $7, 
           updated_at = NOW() 
       WHERE id = $8 
       RETURNING *`,
      [
        data.name,
        data.type,
        data.status,
        data.price_per_day,
        data.description || null,
        data.features || [],
        data.images || [],
        params.vehicleId
      ]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    revalidatePath('/vehicles');
    revalidatePath('/admin/vehicles');

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if vehicle has any active bookings
    const bookingsResult = await query(
      `SELECT COUNT(*) FROM bookings 
       WHERE vehicle_id = $1 
       AND status NOT IN ('cancelled', 'completed')`,
      [params.vehicleId]
    );

    if (parseInt(bookingsResult.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vehicle with active bookings' },
        { status: 400 }
      );
    }

    // Delete vehicle
    const result = await query(
      'DELETE FROM vehicles WHERE id = $1 RETURNING *',
      [params.vehicleId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    revalidatePath('/vehicles');
    revalidatePath('/admin/vehicles');

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
} 