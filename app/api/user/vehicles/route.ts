import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const location = searchParams.get('location');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const isAvailable = searchParams.get('isAvailable');

    let sqlQuery = 'SELECT * FROM vehicles WHERE 1=1';
    const params: any[] = [];

    if (type) {
      sqlQuery += ' AND type = $1';
      params.push(type);
    }

    if (location) {
      sqlQuery += ` AND location ILIKE $${params.length + 1}`;
      params.push(`%${location}%`);
    }

    if (minPrice) {
      sqlQuery += ` AND price_per_hour >= $${params.length + 1}`;
      params.push(minPrice);
    }

    if (maxPrice) {
      sqlQuery += ` AND price_per_hour <= $${params.length + 1}`;
      params.push(maxPrice);
    }

    if (isAvailable === 'true') {
      sqlQuery += ` AND is_available = $${params.length + 1}`;
      params.push(true);
    }

    sqlQuery += ' ORDER BY created_at';

    const availableVehicles = await query(sqlQuery, params);
    return NextResponse.json(availableVehicles);
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
} 