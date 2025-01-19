import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { verifyAuth } from '@/lib/auth';
import logger from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const vehicle = await db
      .select()
      .from(vehicles)
      .where(eq(vehicles.id, params.vehicleId))
      .limit(1);

    if (!vehicle || vehicle.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(vehicle[0]);
  } catch (error) {
    logger.error('Error fetching vehicle details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle details' },
      { status: 500 }
    );
  }
} 