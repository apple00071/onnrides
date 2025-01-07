import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vehicleId = params.vehicleId;
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // First check if there are any active bookings for this vehicle
      const bookingsResult = await client.query(`
        SELECT COUNT(*) FROM bookings 
        WHERE vehicle_id = $1 
        AND status IN ('pending', 'confirmed', 'active')
      `, [vehicleId]);

      if (parseInt(bookingsResult.rows[0].count) > 0) {
        return NextResponse.json(
          { error: 'Cannot delete vehicle with active bookings' },
          { status: 400 }
        );
      }

      // Delete the vehicle
      const result = await client.query(`
        DELETE FROM vehicles
        WHERE id = $1
        RETURNING *
      `, [vehicleId]);

      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: 'Vehicle not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: 'Vehicle deleted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vehicleId = params.vehicleId;
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const name = formData.get('name') as string;
    const type = formData.get('type') as string;
    const location = formData.get('location') as string;
    const price_per_day = parseFloat(formData.get('price_per_day') as string);
    const is_available = formData.get('is_available') === 'true';
    const image = formData.get('image') as File;
    const status = formData.get('status') as string;

    // Handle image upload
    let image_url;
    if (image) {
      // TODO: Implement image upload to a storage service
      // For now, we'll use a placeholder URL
      image_url = '/cars/default.jpg';
    }

    const client = await pool.connect();
    try {
      const updateFields = [
        'name = $1',
        'type = $2',
        'location = $3',
        'price_per_day = $4',
        'status = $5'
      ];
      const values = [
        name,
        type,
        location,
        price_per_day,
        status || 'active',
        vehicleId
      ];

      if (image_url) {
        updateFields.push('image_url = $7');
        values.push(image_url);
      }

      const result = await client.query(`
        UPDATE vehicles
        SET ${updateFields.join(', ')}
        WHERE id = $6
        RETURNING *
      `, values);

      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: 'Vehicle not found' },
          { status: 404 }
        );
      }

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