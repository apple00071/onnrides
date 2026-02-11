import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // Revalidate every hour

export async function GET() {
  try {
    const result = await query(
      "SELECT * FROM vehicles WHERE status = 'active' AND is_available = true ORDER BY name ASC"
    );
    return NextResponse.json({ vehicles: result.rows });
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    // Return empty array instead of error for static generation
    return NextResponse.json({ vehicles: [] });
  }
}