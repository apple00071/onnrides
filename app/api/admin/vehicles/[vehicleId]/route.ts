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
    let locations;
    try {
      locations = JSON.parse(formData.get('location') as string);
    } catch (error) {
      locations = [];
    }
    const quantity = parseInt(formData.get('quantity') as string) || 1;
    const price_per_day = parseFloat(formData.get('price_per_day') as string);
    const is_available = formData.get('is_available') === 'true';
    const status = formData.get('status') as string || (is_available ? 'active' : 'unavailable');

    // Handle image upload
    let image_url;
    const image = formData.get('image') as File;
    if (image) {
      // TODO: Implement image upload to a storage service
      image_url = '/cars/default.jpg';
    }

    const client = await pool.connect();
    try {
      // First, get the current vehicle data
      const currentVehicle = await client.query(
        'SELECT * FROM vehicles WHERE id = $1',
        [vehicleId]
      );

      if (currentVehicle.rowCount === 0) {
        return NextResponse.json(
          { error: 'Vehicle not found' },
          { status: 404 }
        );
      }

      // Prepare update fields
      const updateFields = [];
      const values = [];
      let paramCount = 1;

      // Only update fields that are provided in the formData
      if (name) {
        updateFields.push(`name = $${paramCount}`);
        values.push(name);
        paramCount++;
      }

      if (type) {
        updateFields.push(`type = $${paramCount}`);
        values.push(type);
        paramCount++;
      }

      if (locations && locations.length > 0) {
        updateFields.push(`location = $${paramCount}`);
        values.push(locations);
        paramCount++;
      }

      if (quantity) {
        updateFields.push(`quantity = $${paramCount}`);
        values.push(quantity);
        paramCount++;
      }

      if (price_per_day) {
        updateFields.push(`price_per_day = $${paramCount}`);
        values.push(price_per_day);
        paramCount++;
      }

      if (formData.has('is_available')) {
        updateFields.push(`is_available = $${paramCount}`);
        values.push(is_available);
        paramCount++;
      }

      if (formData.has('status')) {
        updateFields.push(`status = $${paramCount}`);
        values.push(status);
        paramCount++;
      }

      if (image_url) {
        updateFields.push(`image_url = $${paramCount}`);
        values.push(image_url);
        paramCount++;
      }

      // Add vehicleId as the last parameter
      values.push(vehicleId);

      if (updateFields.length === 0) {
        return NextResponse.json(
          { error: 'No fields to update' },
          { status: 400 }
        );
      }

      const result = await client.query(`
        UPDATE vehicles
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

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