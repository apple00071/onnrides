import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/lib/auth';
import { db } from '@/app/lib/lib/db';
import { sql } from 'drizzle-orm';
import logger from '@/lib/logger';
import { uploadToBlob } from '@/lib/upload';

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Fetch all vehicles with their details
    const result = await db.execute(sql`
      SELECT 
        v.*,
        COALESCE(
          jsonb_agg(
            DISTINCT l.name 
            ORDER BY l.name
          ) FILTER (WHERE l.name IS NOT NULL),
          '[]'
        ) as locations
      FROM vehicles v
      LEFT JOIN vehicle_locations vl ON v.id = vl.vehicle_id
      LEFT JOIN locations l ON vl.location_id = l.id
      GROUP BY v.id
      ORDER BY v.created_at DESC
    `);

    // Transform the data to match the expected format
    const vehicles = result.rows.map(vehicle => ({
      id: vehicle.id as string,
      name: vehicle.name as string,
      type: vehicle.type as string,
      location: vehicle.locations as string[],
      quantity: Number(vehicle.quantity),
      price_per_day: Number(vehicle.price_per_day),
      is_available: Boolean(vehicle.is_available),
      status: vehicle.status as string,
      image_url: vehicle.image_url as string,
      created_at: vehicle.created_at as string
    }));

    return NextResponse.json(vehicles);
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const requiredFields = ['name', 'type', 'location', 'quantity', 'price_per_day'];
    
    // Validate required fields
    for (const field of requiredFields) {
      if (!formData.get(field)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Parse and validate price
    const parsedPrice = parseFloat(formData.get('price_per_day') as string);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      );
    }

    // Parse and validate quantity
    const quantity = parseInt(formData.get('quantity') as string, 10);
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
    const image = formData.get('image') as File;
    let image_url = '/cars/default.jpg';
    
    if (image) {
      const filename = `${Date.now()}-${image.name}`;
      image_url = await uploadToBlob(image, filename);
    }

    // Insert the vehicle
    const result = await db.execute(sql`
      INSERT INTO vehicles (
        name, type, quantity, price_per_day, image_url, is_available, status
      ) VALUES (
        ${formData.get('name')},
        ${formData.get('type')},
        ${quantity},
        ${parsedPrice},
        ${image_url},
        true,
        'active'
      )
      RETURNING *
    `);

    // Insert vehicle locations
    for (const location of locations) {
      await db.execute(sql`
        INSERT INTO vehicle_locations (vehicle_id, location_id)
        SELECT ${result.rows[0].id}, id FROM locations WHERE name = ${location}
      `);
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('id');

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [vehicleId];
    let paramIndex = 2;

    if (formData.get('name')) {
      updates.push(`name = $${paramIndex++}`);
      values.push(formData.get('name'));
    }

    if (formData.get('type')) {
      updates.push(`type = $${paramIndex++}`);
      values.push(formData.get('type'));
    }

    if (formData.get('quantity')) {
      const quantity = parseInt(formData.get('quantity') as string, 10);
      if (!isNaN(quantity) && quantity > 0) {
        updates.push(`quantity = $${paramIndex++}`);
        values.push(quantity);
      }
    }

    if (formData.get('price_per_day')) {
      const price = parseFloat(formData.get('price_per_day') as string);
      if (!isNaN(price) && price > 0) {
        updates.push(`price_per_day = $${paramIndex++}`);
        values.push(price);
      }
    }

    if (formData.get('is_available') !== null) {
      updates.push(`is_available = $${paramIndex++}`);
      values.push(formData.get('is_available') === 'true');
    }

    if (formData.get('status')) {
      updates.push(`status = $${paramIndex++}`);
      values.push(formData.get('status'));
    }

    // Handle image upload
    const image = formData.get('image') as File;
    if (image) {
      const filename = `${Date.now()}-${image.name}`;
      const image_url = await uploadToBlob(image, filename);
      updates.push(`image_url = $${paramIndex++}`);
      values.push(image_url);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
    }

    // Update vehicle
    const result = await db.execute(sql`
      UPDATE vehicles 
      SET ${sql.raw(updates.join(', '))}
      WHERE id = $1
      RETURNING *
    `);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Update locations if provided
    if (formData.get('location')) {
      try {
        const locations = JSON.parse(formData.get('location') as string);
        if (Array.isArray(locations)) {
          // Delete existing locations
          await db.execute(sql`
            DELETE FROM vehicle_locations WHERE vehicle_id = ${vehicleId}
          `);

          // Insert new locations
          for (const location of locations) {
            await db.execute(sql`
              INSERT INTO vehicle_locations (vehicle_id, location_id)
              SELECT ${vehicleId}, id FROM locations WHERE name = ${location}
            `);
          }
        }
      } catch (error) {
        logger.error('Error updating vehicle locations:', error);
      }
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }
    
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { message: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('id');

    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    // Check for active bookings
    const bookingsResult = await db.execute(sql`
      SELECT COUNT(*) 
      FROM bookings 
      WHERE vehicle_id = ${vehicleId}
      AND status IN ('pending', 'confirmed', 'active')
    `);

    if (Number(bookingsResult.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vehicle with active bookings' },
        { status: 400 }
      );
    }

    // Delete vehicle locations first
    await db.execute(sql`
      DELETE FROM vehicle_locations WHERE vehicle_id = ${vehicleId}
    `);

    // Delete the vehicle
    const result = await db.execute(sql`
      DELETE FROM vehicles WHERE id = ${vehicleId}
    `);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
} 