import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { query } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from 'crypto';

export async function GET(_request: NextRequest) {
  try {
    const result = await query(
      'SELECT * FROM vehicles ORDER BY created_at'
    );

    const formattedVehicles = result.rows.map(vehicle => {
      let parsedLocation;
      let parsedImages;

      try {
        parsedLocation = JSON.parse(vehicle.location);
      } catch (_e) {
        parsedLocation = [vehicle.location];
      }

      try {
        parsedImages = JSON.parse(vehicle.images);
      } catch (_e) {
        parsedImages = vehicle.images ? [vehicle.images] : [];
      }

      return {
        ...vehicle,
        location: parsedLocation,
        images: parsedImages,
      };
    });

    return NextResponse.json({ vehicles: formattedVehicles });
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
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
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
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
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

    return NextResponse.json({
      message: 'Vehicle created successfully',
      vehicle: {
        ...vehicle,
        location: JSON.parse(vehicle.location),
        images: JSON.parse(vehicle.images),
      }
    });
  } catch (error) {
    logger.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
} 