import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const location = url.searchParams.get('location');
    const pickup = url.searchParams.get('pickup');
    const dropoff = url.searchParams.get('dropoff');

    let queryParams: any[] = [];
    let conditions: string[] = ["v.status = 'active'"];

    if (type) {
      conditions.push('LOWER(v.type) = LOWER($' + (queryParams.length + 1) + ')');
      queryParams.push(type);
    }

    if (location) {
      conditions.push('LOWER(v.location) = LOWER($' + (queryParams.length + 1) + ')');
      queryParams.push(location);
    }

    // Add booking date filter if both pickup and dropoff are provided
    if (pickup && dropoff) {
      conditions.push(`
        NOT EXISTS (
          SELECT 1 FROM bookings b 
          WHERE b.vehicle_id = v.id 
          AND b.status = 'confirmed'
          AND (
            (b.pickup_datetime <= $${queryParams.length + 1} AND b.dropoff_datetime >= $${queryParams.length + 1})
            OR (b.pickup_datetime <= $${queryParams.length + 2} AND b.dropoff_datetime >= $${queryParams.length + 2})
            OR (b.pickup_datetime >= $${queryParams.length + 1} AND b.dropoff_datetime <= $${queryParams.length + 2})
          )
        )
      `);
      queryParams.push(pickup, dropoff);
    }

    const query = `
      SELECT 
        v.id,
        v.name,
        v.type,
        v.price_per_day,
        v.image_url,
        v.location,
        v.status,
        v.created_at
      FROM vehicles v 
      WHERE ${conditions.join(' AND ')}
      ORDER BY v.created_at DESC
    `;

    const result = await client.query(query, queryParams);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const user = await getCurrentUser(request.cookies);
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const data = await request.json();
    
    // Validate required fields
    const requiredFields = [
      'name', 'type', 'brand', 'model', 'year', 'price_per_day',
      'location', 'transmission', 'fuel_type', 'seating_capacity'
    ];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Start transaction
    await client.query('BEGIN');

    const result = await client.query(`
      INSERT INTO vehicles (
        name, description, type, brand, model, year,
        color, transmission, fuel_type, mileage,
        seating_capacity, price_per_day, is_available,
        image_url, location, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      data.name,
      data.description || '',
      data.type,
      data.brand,
      data.model,
      data.year,
      data.color || null,
      data.transmission,
      data.fuel_type,
      data.mileage || 0,
      data.seating_capacity,
      data.price_per_day,
      true,
      data.image_url || null,
      data.location,
      user.id
    ]);

    await client.query('COMMIT');
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 