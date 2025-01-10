import logger from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface Vehicle {
  id: string;
  name: string;
  type: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  registration_number: string;
  price_per_day: number;
  is_available: boolean;
  image_url: string;
  created_at: string;
}

export async function GET(request: NextRequest) {
  let client;
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type');
    const location = searchParams.get('location');
    const pickup = searchParams.get('pickup');
    const dropoff = searchParams.get('dropoff');

    // Get database connection
    client = await pool.connect();

    const queryParams: unknown[] = [];
    const conditions: string[] = ['v.status = \'active\''];

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

    // Build and execute query
    const query = `
      SELECT 
        v.*,
        COALESCE(
          (SELECT COUNT(*) FROM bookings WHERE vehicle_id = v.id AND status = 'completed'),
          0
        ) as total_rides
      FROM vehicles v
      WHERE ${conditions.join(' AND ')}
      ORDER BY v.created_at DESC
    `;

    const result = await client.query<Vehicle>(query, queryParams);
    return NextResponse.json(result.rows);
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}

export async function POST(request: NextRequest) {
  let client;
  try {
    // Check if user is authenticated and is admin
    const session = await getServerSession(authOptions);
    const user = session?.user;

    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const data = await request.json();
    const requiredFields = [
      'name',
      'type',
      'brand',
      'model',
      'year',
      'color',
      'registration_number',
      'price_per_day',
      'image_url'
    ];

    // Validate required fields
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Get database connection
    client = await pool.connect();

    // Start transaction
    await client.query('BEGIN');

    // Insert vehicle
    const result = await client.query(`
      INSERT INTO vehicles (
        name,
        type,
        brand,
        model,
        year,
        color,
        registration_number,
        price_per_day,
        is_available,
        image_url,
        status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, true, $9, 'active'
      )
      RETURNING *
    `, [
      data.name,
      data.type,
      data.brand,
      data.model,
      data.year,
      data.color,
      data.registration_number,
      data.price_per_day,
      data.image_url
    ]);

    await client.query('COMMIT');
    return NextResponse.json(result.rows[0]);
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    logger.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
} 