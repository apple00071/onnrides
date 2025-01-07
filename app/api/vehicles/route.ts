import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const client = await pool.connect();
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
          v.*,
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
      let paramCount = 1;

      if (type) {
        query += ` AND LOWER(v.type) = LOWER($${paramCount})`;
        params.push(type);
        paramCount++;
      }

      if (location) {
        query += ` AND LOWER(v.location) = LOWER($${paramCount})`;
        params.push(location);
        paramCount++;
      }

      // Add date range check if both pickup and dropoff are provided
      if (pickup && dropoff) {
        query += ` AND v.id NOT IN (
          SELECT b.vehicle_id FROM bookings b 
          WHERE b.status NOT IN ('cancelled', 'rejected')
          AND (b.pickup_datetime, b.dropoff_datetime) OVERLAPS ($${paramCount}, $${paramCount + 1})
        )`;
        params.push(new Date(pickup), new Date(dropoff));
      }

      query += ' ORDER BY v.created_at DESC';

      const result = await client.query(query, params);
      return NextResponse.json(result.rows);
    } catch (error) {
      console.error('Database query error:', error);
      return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in vehicles API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const client = await pool.connect();
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

    const result = await client.query(
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
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 