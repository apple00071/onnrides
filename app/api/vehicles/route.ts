import { NextRequest, NextResponse } from 'next/server';
import sql from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const location = url.searchParams.get('location');
    const pickup = url.searchParams.get('pickup');
    const dropoff = url.searchParams.get('dropoff');

    // Build the query
    let query = `
      SELECT 
        v.id,
        v.name,
        v.description,
        v.type,
        v.brand,
        v.model,
        v.year,
        v.color,
        v.transmission,
        v.fuel_type,
        v.mileage,
        v.seating_capacity,
        v.price_per_day,
        v.is_available,
        v.image_url,
        v.location,
        v.created_at,
        COALESCE(
          (SELECT COUNT(*) FROM bookings b 
           WHERE b.vehicle_id = v.id 
           AND b.status = 'completed'),
          0
        ) as total_rides
      FROM vehicles v 
      WHERE v.is_available = true
    `;
    const params: any[] = [];

    if (type) {
      query += ` AND LOWER(v.type) = LOWER($1)`;
      params.push(type);
    }

    if (location) {
      query += ` AND LOWER(v.location) = LOWER($${params.length + 1})`;
      params.push(location);
    }

    // Add date range check if both pickup and dropoff are provided
    if (pickup && dropoff) {
      query += ` AND v.id NOT IN (
        SELECT b.vehicle_id FROM bookings b 
        WHERE b.status NOT IN ('cancelled', 'rejected')
        AND (b.pickup_datetime, b.dropoff_datetime) OVERLAPS ($${params.length + 1}, $${params.length + 2})
      )`;
      params.push(new Date(pickup), new Date(dropoff));
    }

    query += ' ORDER BY v.created_at DESC';

    console.log('Executing query:', query, 'with params:', params);

    const result = await sql.query(query, params);
    
    // Format the response data
    const vehicles = result.rows.map((vehicle: {
      price_per_day: string;
      total_rides: string;
      [key: string]: any;
    }) => ({
      ...vehicle,
      price_per_day: parseFloat(vehicle.price_per_day),
      total_rides: parseInt(vehicle.total_rides)
    }));

    return NextResponse.json(vehicles);
  } catch (error: any) {
    console.error('Error in vehicles API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
    } = await request.json();

    // Validate required fields
    if (!name || !type || !brand || !model || !year || !price_per_day) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await sql.query(
      `INSERT INTO vehicles (
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
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
        is_available || true,
        image_url,
        location
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { message: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
} 