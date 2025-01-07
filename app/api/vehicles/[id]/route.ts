import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicleId = params.id;
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT 
          id, name, type, location, price_per_day, 
          image_url, created_at, updated_at
        FROM vehicles
        WHERE id = $1
      `, [vehicleId]);

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
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
    if (!user || user.role !== 'admin') {
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
    const {
      name,
      description,
      type,
      brand,
      model,
      year,
      color,
      transmission,
      fuel_type,
      mileage,
      seating_capacity,
      price_per_day,
      is_available,
      image_url,
      location
    } = body;

    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE vehicles
        SET 
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          type = COALESCE($3, type),
          brand = COALESCE($4, brand),
          model = COALESCE($5, model),
          year = COALESCE($6, year),
          color = COALESCE($7, color),
          transmission = COALESCE($8, transmission),
          fuel_type = COALESCE($9, fuel_type),
          mileage = COALESCE($10, mileage),
          seating_capacity = COALESCE($11, seating_capacity),
          price_per_day = COALESCE($12, price_per_day),
          is_available = COALESCE($13, is_available),
          image_url = COALESCE($14, image_url),
          location = COALESCE($15, location)
        WHERE id = $16
        RETURNING *
      `, [
        name,
        description,
        type,
        brand,
        model,
        year,
        color,
        transmission,
        fuel_type,
        mileage,
        seating_capacity,
        price_per_day,
        is_available,
        image_url,
        location,
        vehicleId
      ]);

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vehicleId = params.id;
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { location } = body;

    if (!location) {
      return NextResponse.json(
        { error: 'Location is required' },
        { status: 400 }
      );
    }

    const client = await pool.connect();
    try {
      // Update the vehicle location
      const result = await client.query(`
        UPDATE vehicles
        SET location = $1
        WHERE id = $2
        RETURNING *
      `, [location, vehicleId]);

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
    console.error('Error updating vehicle location:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle location' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const user = await getCurrentUser(request.cookies);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vehicleId = params.id;
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