import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import logger from '@/lib/logger';

// Cache the maintenance mode status for 60 seconds
let maintenanceMode: boolean | null = null;
let lastCheck = 0;
const CACHE_DURATION = 60 * 1000; // 60 seconds

export const dynamic = 'force-dynamic'; // Always run the maintenance check

export async function GET() {
  const now = Date.now();
  
  // Return cached value if available and not expired
  if (maintenanceMode !== null && (now - lastCheck) < CACHE_DURATION) {
    logger.debug('Returning cached maintenance mode status:', { maintenance: maintenanceMode });
    return NextResponse.json({ maintenance: maintenanceMode });
  }

  try {
    logger.debug('Checking maintenance mode from database');
    const setting = await db
      .selectFrom('settings')
      .selectAll()
      .where('key', '=', 'maintenance_mode')
      .executeTakeFirst();

    maintenanceMode = setting?.value === 'true';
    lastCheck = now;
    
    logger.debug('Maintenance mode status retrieved from database:', { 
      maintenance: maintenanceMode,
      settingFound: !!setting,
      settingValue: setting?.value
    });
    
    return NextResponse.json({ maintenance: maintenanceMode });
  } catch (error) {
    logger.error('Error checking maintenance mode:', error);
    return NextResponse.json({ maintenance: false });
  }
} 