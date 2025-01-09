import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { uploadToBlob, deleteFromBlob } from '@/lib/blob';

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
      // Get the current image URL to delete it later
      const currentImage = await pool.query(
        'SELECT image_url FROM vehicles WHERE id = $1',
        [vehicleId]
      );

      // Upload new image
      const filename = `vehicles/${Date.now()}-${image.name}`;
      image_url = await uploadToBlob(image, filename);

      // Delete old image if it exists and is not the default image
      if (currentImage.rows[0]?.image_url && !currentImage.rows[0].image_url.includes('default.jpg')) {
        try {
          await deleteFromBlob(currentImage.rows[0].image_url);
        } catch (error) {
          console.error('Error deleting old image:', error);
        }
      }
    }

    const client = await pool.connect();
    try {
      const updateFields = [
        name && 'name = $1',
        type && 'type = $2',
        locations.length > 0 && 'location = $3',
        'quantity = $4',
        'price_per_day = $5',
        image_url && 'image_url = $6',
        'status = $7',
        'is_available = $8',
        'updated_at = CURRENT_TIMESTAMP'
      ].filter(Boolean).join(', ');

      const values = [
        name,
        type,
        locations,
        quantity,
        price_per_day,
        image_url,
        status,
        is_available,
        vehicleId
      ];

      const result = await client.query(`
        UPDATE vehicles
        SET ${updateFields}
        WHERE id = $${values.length}
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