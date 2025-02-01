import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { getDb } from '@/lib/db';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomUUID } from 'crypto';
import type { NewVehicle, Vehicle } from '@/lib/schema';
import { query } from '@/lib/db';

export async function GET(_request: NextRequest) {
  try {
    const db = getDb();
    const vehicles = await db
      .selectFrom('vehicles')
      .selectAll()
      .orderBy('created_at')
      .execute();

    const formattedVehicles = vehicles.map(vehicle => {
      // Clean up location data
      let locations;
      try {
        if (typeof vehicle.location === 'string') {
          // Try to parse if it's a JSON string
          const parsed = JSON.parse(vehicle.location);
          if (Array.isArray(parsed)) {
            locations = parsed;
          } else if (typeof parsed === 'object' && parsed.name) {
            locations = Array.isArray(parsed.name) ? parsed.name : [parsed.name];
          } else {
            locations = [String(parsed)];
          }
        } else if (Array.isArray(vehicle.location)) {
          locations = vehicle.location;
        } else {
          locations = [String(vehicle.location)];
        }

        // Clean up each location
        locations = locations
          .map(loc => loc.trim())
          .filter(Boolean)
          .map(loc => loc.replace(/^["']|["']$/g, '')) // Remove quotes
          .map(loc => loc.replace(/\\+/g, '')); // Remove backslashes
      } catch (e) {
        logger.error('Error parsing location:', e);
        locations = [String(vehicle.location).replace(/[{}"\\]/g, '').trim()];
      }

      // Clean up images
      let images;
      try {
        images = Array.isArray(vehicle.images) 
          ? vehicle.images 
          : typeof vehicle.images === 'string' 
            ? JSON.parse(vehicle.images)
            : [];
      } catch (e) {
        images = vehicle.images ? [vehicle.images] : [];
      }

      return {
        ...vehicle,
        location: locations,
        images: images,
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
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    logger.info('Received vehicle creation request:', { data });
    
    // Validate required fields
    if (!data.name || !data.type || !data.price_per_hour || !data.location || data.location.length === 0) {
      logger.warn('Missing required fields:', { data });
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Ensure location is properly formatted
    let location = data.location;
    if (typeof location === 'string') {
      // If it's a single location, convert to array
      location = [location];
    } else if (Array.isArray(location)) {
      // If it's already an array, clean it
      location = location.map(loc => loc.trim()).filter(Boolean);
    } else if (typeof location === 'object' && location.name) {
      // If it's an object with name property, extract locations
      location = Array.isArray(location.name) ? location.name : [location.name];
    }

    // Convert location array to JSON string
    const locationJson = JSON.stringify(location);

    const db = getDb();

    try {
      // Create the vehicle
      const [vehicle] = await db
        .insertInto('vehicles')
        .values({
          id: randomUUID(),
          name: data.name,
          type: data.type as 'car' | 'bike',
          location: locationJson,
          quantity: Number(data.quantity) || 1,
          price_per_hour: Number(data.price_per_hour),
          min_booking_hours: Number(data.min_booking_hours) || 1,
          images: JSON.stringify(data.images || []),
          status: data.status || 'active',
          is_available: true,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning([
          'id',
          'name',
          'type',
          'location',
          'quantity',
          'price_per_hour',
          'min_booking_hours',
          'images',
          'status',
          'is_available',
          'created_at',
          'updated_at'
        ])
        .execute();

      logger.info('Vehicle created successfully:', { vehicleId: vehicle.id });

      // Format the response
      const formattedVehicle = {
        ...vehicle,
        location: JSON.parse(vehicle.location),
        images: JSON.parse(vehicle.images)
      };

      return NextResponse.json({
        success: true,
        data: {
          vehicle: formattedVehicle
        }
      });
    } catch (dbError: any) {
      logger.error('Database error creating vehicle:', {
        error: dbError,
        message: dbError.message,
        data
      });
      throw new Error(`Database error: ${dbError.message}`);
    }
  } catch (error: any) {
    logger.error('Error creating vehicle:', {
      error,
      message: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      { error: 'Failed to create vehicle: ' + (error.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { id, ...updateData } = data;

    // Ensure location is properly formatted
    if (updateData.location) {
      let location = updateData.location;
      if (typeof location === 'string') {
        location = [location];
      } else if (Array.isArray(location)) {
        location = location.map(loc => loc.trim()).filter(Boolean);
      } else if (typeof location === 'object' && location.name) {
        location = Array.isArray(location.name) ? location.name : [location.name];
      }
      updateData.location = JSON.stringify(location);
    }

    // Convert images to JSON if present
    if (updateData.images) {
      updateData.images = JSON.stringify(updateData.images);
    }

    const setClauses = Object.entries(updateData)
      .map(([key, value], index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [id, ...Object.values(updateData)];

    const result = await query(`
      UPDATE vehicles 
      SET ${setClauses}, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    // Parse JSON fields before sending response
    const vehicle = {
      ...result.rows[0],
      location: JSON.parse(result.rows[0].location),
      images: JSON.parse(result.rows[0].images)
    };

    return NextResponse.json({
      success: true,
      data: { vehicle }
    });
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
} 