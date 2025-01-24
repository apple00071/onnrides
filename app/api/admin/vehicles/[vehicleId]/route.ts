import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import { vehicles, VEHICLE_STATUS } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';
import logger from '@/lib/logger';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';
import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';

interface VehicleRow {
  id: string;
  name: string;
  type: string;
  location: string;
  images: string;
  quantity: number;
  price_per_hour: number;
  min_booking_hours: number;
  is_available: boolean;
  status: string;
  created_at: Date;
  updated_at: Date;
}

interface UpdateVehicleData {
  name?: string;
  type?: string;
  location?: string;
  quantity?: number;
  price_per_hour?: number;
  min_booking_hours?: number;
  images?: string;
  is_available?: boolean;
  status?: typeof VEHICLE_STATUS[number];
  updated_at: Date;
}

export async function GET(
  request: Request,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const vehicle = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, params.vehicleId));

    if (!vehicle || vehicle.length === 0) {
      return new Response(JSON.stringify({ message: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      message: 'Vehicle fetched successfully',
      vehicle: {
        ...vehicle[0],
        location: vehicle[0].location.split(', '),
        images: JSON.parse(vehicle[0].images)
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error fetching vehicle:', error);
    return new Response(JSON.stringify({ message: 'Error fetching vehicle' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
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

    const { vehicleId } = params;
    if (!vehicleId) {
      return new Response(JSON.stringify({ error: 'Vehicle ID is required' }), {
        status: 400,
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
      is_available,
      status
    } = body;

    // Prepare update data
    const updateData: UpdateVehicleData = {
      updated_at: new Date()
    };

    // Only include fields that are provided and handle them properly
    if (name) updateData.name = name;
    if (type) updateData.type = type;
    if (location) {
      updateData.location = Array.isArray(location) 
        ? location.join(', ')
        : location;
    }
    if (quantity !== undefined) updateData.quantity = quantity;
    if (price_per_hour !== undefined) updateData.price_per_hour = price_per_hour;
    if (min_booking_hours !== undefined) updateData.min_booking_hours = min_booking_hours;
    if (images) {
      updateData.images = Array.isArray(images) ? JSON.stringify(images) : images;
    }
    if (is_available !== undefined) updateData.is_available = is_available;
    if (status) updateData.status = status;

    // Update vehicle
    const updatedVehicles = await db
      .update(vehicles)
      .set(updateData)
      .where(eq(vehicles.id, vehicleId))
      .returning();

    if (!updatedVehicles || updatedVehicles.length === 0) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const vehicle = updatedVehicles[0];

    // Format the response data
    const responseVehicle = {
      ...vehicle,
      location: vehicle.location.includes('[') 
        ? JSON.parse(vehicle.location)
        : vehicle.location.split(', '),
      images: JSON.parse(vehicle.images)
    };

    return new Response(JSON.stringify({
      message: 'Vehicle updated successfully',
      vehicle: responseVehicle
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return new Response(JSON.stringify({ error: 'Failed to update vehicle' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
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

    const { vehicleId } = params;
    if (!vehicleId) {
      return new Response(JSON.stringify({ error: 'Vehicle ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const deletedVehicles = await db
      .delete(vehicles)
      .where(eq(vehicles.id, vehicleId))
      .returning();

    if (!deletedVehicles || deletedVehicles.length === 0) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      message: 'Vehicle deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete vehicle' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 