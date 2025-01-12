import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import pool, { COLLECTIONS, findAll, insertOne } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';
import type { Vehicle } from '@/app/lib/types';

interface CreateVehicleBody {
  name: string;
  description: string;
  type: 'car' | 'bike';
  brand: string;
  model: string;
  year: number;
  color: string;
  licensePlate: string;
  seats: number;
  transmission: 'manual' | 'automatic';
  fuelType: string;
  pricePerDay: number;
  location: string;
  imageUrl: string;
}

// GET /api/vehicles - List all vehicles
export async function GET(request: NextRequest) {
  try {
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const pickupDate = searchParams.get('pickupDate');
    const dropoffDate = searchParams.get('dropoffDate');

    // Fetch all vehicles with availability check
    const query = `
      SELECT v.* 
      FROM ${COLLECTIONS.VEHICLES} v
      WHERE v.is_available = true
      ${pickupDate && dropoffDate ? `
        AND v.id NOT IN (
          SELECT vehicle_id 
          FROM ${COLLECTIONS.BOOKINGS}
          WHERE status = 'confirmed'
          AND (
            (pickup_datetime <= $1 AND dropoff_datetime >= $1)
            OR (pickup_datetime <= $2 AND dropoff_datetime >= $2)
            OR (pickup_datetime >= $1 AND dropoff_datetime <= $2)
          )
        )
      ` : ''}
      ORDER BY v.created_at DESC
    `;

    const params = pickupDate && dropoffDate ? [new Date(pickupDate), new Date(dropoffDate)] : [];
    const result = await pool.query<Vehicle>(query, params);

    // Transform the data to match frontend expectations
    const transformedVehicles = result.rows.map((vehicle: Vehicle) => ({
      id: vehicle.id,
      name: vehicle.name,
      type: vehicle.type,
      location: Array.isArray(vehicle.location) ? vehicle.location : [vehicle.location],
      price_per_day: vehicle.pricePerDay,
      is_available: vehicle.isAvailable,
      image_url: vehicle.imageUrl,
      brand: vehicle.model.split(' ')[0], // Assuming brand is first part of model
      model: vehicle.model.split(' ').slice(1).join(' '), // Rest is model
      year: vehicle.year,
      color: vehicle.color,
      transmission: vehicle.transmission,
      fuel_type: vehicle.fuelType,
      seating_capacity: vehicle.seatingCapacity
    }));

    return NextResponse.json(transformedVehicles);

  } catch (error) {
    logger.error('Failed to fetch vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Create vehicle
export async function POST(request: NextRequest) {
  try {
    // Verify authentication and admin role
    const authResult = await verifyAuth(request);
    if (!authResult || authResult.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as CreateVehicleBody;

    // Create vehicle
    const vehicleData = {
      id: crypto.randomUUID(),
      ...body,
      seatingCapacity: body.seats,
      registrationNumber: body.licensePlate,
      isAvailable: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await insertOne(COLLECTIONS.VEHICLES, vehicleData);

    return NextResponse.json({
      success: true,
      message: 'Vehicle created successfully',
      vehicle: vehicleData
    });

  } catch (error) {
    logger.error('Failed to create vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
} 