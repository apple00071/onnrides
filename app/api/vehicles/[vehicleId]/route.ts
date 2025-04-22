import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';

interface UpdateVehicleBody {
  name?: string;
  description?: string;
  type?: string;
  brand?: string;
  model?: string;
  year?: number;
  color?: string;
  licensePlate?: string;
  seats?: number;
  transmission?: 'manual' | 'automatic';
  fuelType?: string;
  pricePerDay?: number;
  location?: string;
  images?: string[];
  isAvailable?: boolean;
}

// GET /api/vehicles/[vehicleId] - Get vehicle by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const result = await query(`
      SELECT 
        id, 
        name, 
        type, 
        location, 
        price_per_hour,
        price_7_days,
        price_15_days,
        price_30_days,
        images,
        created_at, 
        updated_at
      FROM vehicles
      WHERE id = $1
    `, [params.vehicleId]);

    if (result.rowCount === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'Vehicle not found' }),
        { 
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          }
        }
      );
    }

    // Parse JSON fields
    const vehicle = {
      ...result.rows[0],
      location: JSON.parse(result.rows[0].location || '[]'),
      images: JSON.parse(result.rows[0].images || '[]')
    };

    return new NextResponse(
      JSON.stringify(vehicle),
      { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Failed to fetch vehicle' }),
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );
  }
}

// PUT /api/vehicles/[vehicleId] - Update vehicle
export async function PUT(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    const result = await query(`
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
        location = COALESCE($15, location),
        updated_at = NOW()
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
      params.vehicleId
    ]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
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

// DELETE /api/vehicles/[vehicleId] - Delete vehicle
export async function DELETE(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check for active bookings
    const bookingsResult = await query(`
      SELECT COUNT(*) FROM bookings 
      WHERE vehicle_id = $1 
      AND status IN ('pending', 'confirmed', 'active')
    `, [params.vehicleId]);

    if (parseInt(bookingsResult.rows[0].count) > 0) {
      return NextResponse.json(
        { error: 'Cannot delete vehicle with active bookings' },
        { status: 400 }
      );
    }

    // Delete the vehicle
    const result = await query(`
      DELETE FROM vehicles
      WHERE id = $1
      RETURNING *
    `, [params.vehicleId]);

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