import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import { verifyAuth } from '@/lib/auth';
import { vehicles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const user = await verifyAuth(cookieStore);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Get all vehicles
    const allVehicles = await db
      .select({
        id: vehicles.id,
        name: vehicles.name,
        type: vehicles.type,
        quantity: vehicles.quantity,
        price_per_day: vehicles.price_per_day,
        location: vehicles.location,
        images: vehicles.images,
        created_at: vehicles.created_at,
        updated_at: vehicles.updated_at,
      })
      .from(vehicles);

    return NextResponse.json(allVehicles);
  } catch (error) {
    logger.error('Failed to fetch vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const user = await verifyAuth(cookieStore);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const data = await request.json();

    // Ensure location and images are valid JSON objects
    const location = typeof data.location === 'object' ? data.location : {};
    const images = Array.isArray(data.images) ? data.images : [];
    const now = new Date().toISOString();

    // Insert new vehicle using raw SQL to ensure proper JSON formatting
    const result = await sql`
      INSERT INTO vehicles (
        name, type, quantity, price_per_day, location, images, 
        created_at, updated_at
      ) VALUES (
        ${data.name}, ${data.type}, ${data.quantity}, ${data.price_per_day},
        ${JSON.stringify(location)}::jsonb, ${JSON.stringify(images)}::jsonb,
        ${now}, ${now}
      )
    `;

    return NextResponse.json({ message: 'Vehicle created successfully' });
  } catch (error) {
    logger.error('Failed to create vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const user = await verifyAuth(cookieStore);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    // Delete vehicle
    await db.delete(vehicles).where(eq(vehicles.id, id));

    return NextResponse.json({ message: 'Vehicle deleted successfully' });
  } catch (error) {
    logger.error('Failed to delete vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
} 