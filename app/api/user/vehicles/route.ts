import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/schema';
import { eq, and, like, sql } from 'drizzle-orm';
import logger from '@/lib/logger';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const location = searchParams.get('location');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const isAvailable = searchParams.get('isAvailable');

    const conditions = [];

    if (type) {
      conditions.push(eq(vehicles.type, type));
    }

    if (location) {
      conditions.push(like(vehicles.location, `%${location}%`));
    }

    if (minPrice) {
      conditions.push(sql`${vehicles.price_per_hour} >= ${minPrice}`);
    }

    if (maxPrice) {
      conditions.push(sql`${vehicles.price_per_hour} <= ${maxPrice}`);
    }

    if (isAvailable === 'true') {
      conditions.push(eq(vehicles.is_available, true));
    }

    const availableVehicles = await db
      .select()
      .from(vehicles)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(vehicles.created_at);

    return NextResponse.json(availableVehicles);
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
} 