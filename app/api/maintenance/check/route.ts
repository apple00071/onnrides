import { NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic'; // Always run the maintenance check

export async function GET() {
  try {
    // Check the database for the current maintenance mode setting
    const setting = await db
      .selectFrom('settings')
      .selectAll()
      .where('key', '=', 'maintenance_mode')
      .executeTakeFirst();
    
    const maintenanceMode = setting?.value === 'true';
    
    return NextResponse.json({ 
      maintenance: maintenanceMode,
      source: 'database'
    });
  } catch (error) {
    logger.error('Error in maintenance check:', error);
    
    // If there's an error, default to non-maintenance mode
    return NextResponse.json({ 
      maintenance: false,
      error: 'Error occurred',
      source: 'error-fallback'
    });
  }
} 