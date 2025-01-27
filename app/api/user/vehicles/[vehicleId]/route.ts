import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from "next-auth/next";
import { authOptions } from '@/app/api/auth/[...nextauth]/auth-options';

export async function GET(
  request: Request,
  { params }: { params: { vehicleId: string } }
) {
  try {
    const result = await query(
      'SELECT * FROM vehicles WHERE id = $1',
      [params.vehicleId]
    );

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    const vehicle = result.rows[0];

    return NextResponse.json({
      message: 'Vehicle fetched successfully',
      vehicle: {
        ...vehicle,
        location: vehicle.location.split(', '),
        images: JSON.parse(vehicle.images)
      }
    });
  } catch (error) {
    logger.error('Error fetching vehicle details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle details' },
      { status: 500 }
    );
  }
}