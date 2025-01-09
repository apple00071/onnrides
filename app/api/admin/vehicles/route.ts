import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { uploadToBlob } from '@/lib/blob';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          id, name, type, location, price_per_day, 
          image_url, status, created_at, updated_at
        FROM vehicles
        ORDER BY created_at DESC
      `);

      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    
    // Validate required fields
    const requiredFields = [
      'name', 'type', 'location', 'price_per_day', 'quantity'
    ];
    
    for (const field of requiredFields) {
      if (!formData.get(field)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Parse and validate price
    const price_per_day = formData.get('price_per_day');
    const parsedPrice = parseFloat(price_per_day as string);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      );
    }

    // Parse and validate quantity
    const quantity = parseInt(formData.get('quantity') as string);
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: 'Invalid quantity' },
        { status: 400 }
      );
    }

    // Parse locations array
    let locations;
    try {
      locations = JSON.parse(formData.get('location') as string);
      if (!Array.isArray(locations) || locations.length === 0) {
        throw new Error('Invalid locations');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid locations format' },
        { status: 400 }
      );
    }

    // Handle image upload
    let image_url = '';
    const image = formData.get('image') as File;
    if (image) {
      const filename = `vehicles/${Date.now()}-${image.name}`;
      image_url = await uploadToBlob(image, filename);
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        INSERT INTO vehicles (
          name,
          type,
          location,
          quantity,
          price_per_day,
          image_url,
          status,
          is_available
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        formData.get('name'),
        formData.get('type'),
        locations,
        quantity,
        parsedPrice,
        image_url || '/cars/default.jpg',
        'active',
        true
      ]);

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get vehicle ID from URL
    const vehicleId = request.nextUrl.pathname.split('/').pop();
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
    const status = formData.get('status') as string;

    // Handle image upload
    let image_url;
    const image = formData.get('image') as File;
    if (image) {
      // TODO: Implement image upload to a storage service
      image_url = '/cars/default.jpg';
    }

    const client = await pool.connect();
    try {
      const updateFields = [
        'name = $1',
        'type = $2',
        'location = $3',
        'quantity = $4',
        'price_per_day = $5',
        'status = $6',
        'is_available = $7'
      ];
      const values = [
        name,
        type,
        locations,
        quantity,
        price_per_day,
        status || 'active',
        is_available,
        vehicleId
      ];

      if (image_url) {
        updateFields.push('image_url = $9');
        values.push(image_url);
      }

      const result = await client.query(`
        UPDATE vehicles
        SET ${updateFields.join(', ')}
        WHERE id = $8
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

export async function DELETE(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get vehicle ID from URL
    const vehicleId = request.nextUrl.pathname.split('/').pop();
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
        SELECT COUNT(*) as count
        FROM bookings
        WHERE vehicle_id = $1
        AND status NOT IN ('completed', 'cancelled')
      `, [vehicleId]);

      if (bookingsResult.rows[0].count > 0) {
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