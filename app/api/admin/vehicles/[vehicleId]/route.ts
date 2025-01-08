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
    
    // Create an array to store update fields and values
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    // Only add fields that are present in the formData
    if (formData.get('name')) {
      updateFields.push(`name = $${paramCount}`);
      values.push(formData.get('name'));
      paramCount++;
    }

    if (formData.get('type')) {
      updateFields.push(`type = $${paramCount}`);
      values.push(formData.get('type'));
      paramCount++;
    }

    if (formData.get('location')) {
      updateFields.push(`location = $${paramCount}`);
      values.push(formData.get('location'));
      paramCount++;
    }

    if (formData.get('price_per_day')) {
      const price = parseFloat(formData.get('price_per_day') as string);
      if (!isNaN(price) && price > 0) {
        updateFields.push(`price_per_day = $${paramCount}`);
        values.push(price);
        paramCount++;
      }
    }

    if (formData.get('status')) {
      updateFields.push(`status = $${paramCount}`);
      values.push(formData.get('status'));
      paramCount++;
    }

    // Handle image if present
    const image = formData.get('image') as File;
    if (image) {
      // TODO: Implement image upload to a storage service
      const image_url = '/cars/default.jpg';
      updateFields.push(`image_url = $${paramCount}`);
      values.push(image_url);
      paramCount++;
    }

    // Add vehicleId as the last parameter
    values.push(vehicleId);

    // If no fields to update, return error
    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE vehicles
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
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