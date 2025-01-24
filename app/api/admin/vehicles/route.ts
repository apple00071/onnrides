import { NextRequest } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { vehicles, vehicleTypeEnum } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";

export async function GET(request: NextRequest) {
  try {
    const result = await db
      .select()
      .from(vehicles)
      .orderBy(vehicles.created_at);

    const formattedVehicles = result.map(vehicle => {
      let parsedLocation;

      try {
        parsedLocation = JSON.parse(vehicle.location);
      } catch (e) {
        parsedLocation = [vehicle.location];
      }

      return {
        ...vehicle,
        location: parsedLocation,
        display_name: `${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
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
    const user = await verifyAuth();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const {
      brand,
      model,
      type,
      year,
      color,
      location,
      description,
      price_per_day,
    } = body;

    // Validate required fields
    if (!brand || !model || !type || !year || !color || !location || !price_per_day) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Ensure location is properly formatted
    const locationJson = Array.isArray(location) 
      ? JSON.stringify(location)
      : JSON.stringify([location]);

    // Create vehicle
    const [vehicle] = await db
      .insert(vehicles)
      .values({
        owner_id: user.id,
        brand,
        model,
        type,
        year,
        color,
        location: locationJson,
        description,
        price_per_day: price_per_day.toString(),
        is_available: true,
      })
      .returning();

    return new Response(JSON.stringify({
      message: 'Vehicle created successfully',
      vehicle: {
        ...vehicle,
        location: JSON.parse(vehicle.location),
        display_name: `${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
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

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return new Response(JSON.stringify({ message: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (session.user.role !== 'admin') {
      return new Response(JSON.stringify({ message: 'Admin access required' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ message: 'Vehicle ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Delete vehicle
    await db.delete(vehicles).where(eq(vehicles.id, id));

    return new Response(JSON.stringify({ message: 'Vehicle deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    return new Response(JSON.stringify({ message: 'Failed to delete vehicle' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 