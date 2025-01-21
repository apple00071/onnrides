import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { vehicles } from '@/lib/schema';
import { sql } from 'drizzle-orm';
import logger from '@/lib/logger';

export async function GET() {
  try {
    // Get all vehicles
    const allVehicles = await db.select().from(vehicles);
    
    // Get table info
    const tableInfo = await db.execute(sql`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'vehicles';
    `);

    return NextResponse.json({
      message: 'Debug info retrieved successfully',
      vehicles: allVehicles,
      tableInfo: tableInfo.rows
    });
  } catch (error) {
    logger.error('Debug error:', error);
    return NextResponse.json(
      { message: 'Debug failed', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 