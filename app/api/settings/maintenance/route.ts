import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import logger from '@/lib/logger';

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const setting = await db
      .selectFrom('settings')
      .selectAll()
      .where('key', '=', 'maintenance_mode')
      .executeTakeFirst();

    return NextResponse.json({
      maintenanceMode: setting?.value === 'true'
    });
  } catch (error) {
    logger.error('Error checking maintenance mode:', error);
    return NextResponse.json({
      maintenanceMode: false
    });
  }
} 