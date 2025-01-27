import { NextRequest } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from 'crypto';

// ... existing code remains unchanged as it already uses query and raw SQL ...
export async function GET(request: NextRequest) {
  try {
    const result = await query(
      'SELECT * FROM vehicles ORDER BY created_at'
    );

    const formattedVehicles = result.rows.map(vehicle => {
      let parsedLocation;
      let parsedImages;

      try {
        parsedLocation = JSON.parse(vehicle.location);
      } catch (e) {
        parsedLocation = [vehicle.location];
      }

      try {
        parsedImages = JSON.parse(vehicle.images);
      } catch (e) {
        parsedImages = vehicle.images ? [vehicle.images] : [];
      }

      return {
        ...vehicle,
        location: parsedLocation,
        images: parsedImages,
      };
    });

    return new Response(JSON.stringify({ vehicles: formattedVehicles }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch vehicles' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const {
      name,
      type,
      location,
      quantity,
      price_per_hour,
      min_booking_hours,
      images,
      is_available = true,
    } = body;

    // Validate required fields
    if (!name || !type || !location || !quantity || !price_per_hour || !min_booking_hours || !images) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure location is properly formatted
    const locationJson = Array.isArray(location) 
      ? JSON.stringify(location)
      : JSON.stringify([location]);

    // Ensure images is properly formatted
    const imagesJson = Array.isArray(images)
      ? JSON.stringify(images)
      : JSON.stringify([images]);

    // Create vehicle with explicit ID
    const result = await query(
      `INSERT INTO vehicles (
        id, name, type, location, quantity, price_per_hour, 
        min_booking_hours, images, is_available, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW()) 
      RETURNING *`,
      [
        randomUUID(),
        name,
        type,
        locationJson,
        quantity.toString(),
        price_per_hour.toString(),
        min_booking_hours.toString(),
        imagesJson,
        is_available,
      ]
    );

    const vehicle = result.rows[0];

    return new Response(JSON.stringify({
      message: 'Vehicle created successfully',
      vehicle: {
        ...vehicle,
        location: JSON.parse(vehicle.location),
        images: JSON.parse(vehicle.images),
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error creating vehicle:', error);
    return new Response(JSON.stringify({ error: 'Failed to create vehicle' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 