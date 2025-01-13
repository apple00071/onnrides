import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/app/lib/lib/db';
import { sql } from 'drizzle-orm';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/lib/auth';
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
    const query = sql`
      SELECT v.* 
      FROM vehicles v
      WHERE v.is_available = true
      ${pickupDate && dropoffDate ? sql`
        AND v.id NOT IN (
          SELECT vehicle_id 
          FROM bookings
          WHERE status = 'confirmed'
          AND (
            (start_date <= ${new Date(pickupDate!)} AND end_date >= ${new Date(pickupDate!)})
            OR (start_date <= ${new Date(dropoffDate!)} AND end_date >= ${new Date(dropoffDate!)})
            OR (start_date >= ${new Date(pickupDate!)} AND end_date <= ${new Date(dropoffDate!)})
          )
        )
      ` : sql``}
      ORDER BY v.created_at DESC
    `;

    const result = await db.execute(query);
    const vehicles = result.rows.map(row => ({
      id: row.id as string,
      name: row.name as string,
      description: row.description as string,
      type: row.type as 'car' | 'bike',
      brand: row.brand as string,
      model: row.model as string,
      year: row.year as number,
      color: row.color as string,
      license_plate: row.license_plate as string,
      seats: row.seats as number,
      transmission: row.transmission as 'manual' | 'automatic',
      fuel_type: row.fuel_type as string,
      price_per_day: row.price_per_day as number,
      location: row.location,
      images: row.images as string[],
      is_available: row.is_available as boolean,
      owner_id: row.owner_id as string,
      created_at: row.created_at as Date,
      updated_at: row.updated_at as Date
    })) as Vehicle[];

    return NextResponse.json(vehicles);

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
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json() as CreateVehicleBody;

    // Create vehicle
    const vehicleData = {
      name: body.name,
      description: body.description,
      type: body.type,
      brand: body.brand,
      model: body.model,
      year: body.year,
      color: body.color,
      license_plate: body.licensePlate,
      seats: body.seats,
      transmission: body.transmission,
      fuel_type: body.fuelType,
      price_per_day: body.pricePerDay,
      location: JSON.parse(body.location),
      images: [body.imageUrl],
      is_available: true,
      owner_id: session.user.id,
      created_at: new Date(),
      updated_at: new Date()
    };

    const result = await db.execute(
      sql`
        INSERT INTO vehicles (
          name, description, type, brand, model, year, color,
          license_plate, seats, transmission, fuel_type, price_per_day,
          location, images, is_available, owner_id, created_at, updated_at
        ) VALUES (
          ${vehicleData.name}, ${vehicleData.description}, ${vehicleData.type},
          ${vehicleData.brand}, ${vehicleData.model}, ${vehicleData.year},
          ${vehicleData.color}, ${vehicleData.license_plate}, ${vehicleData.seats},
          ${vehicleData.transmission}, ${vehicleData.fuel_type}, ${vehicleData.price_per_day},
          ${vehicleData.location}, ${vehicleData.images}, ${vehicleData.is_available},
          ${vehicleData.owner_id}, ${vehicleData.created_at}, ${vehicleData.updated_at}
        )
        RETURNING *
      `
    );

    return NextResponse.json({
      success: true,
      message: 'Vehicle created successfully',
      vehicle: result.rows[0]
    });

  } catch (error) {
    logger.error('Failed to create vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
} 