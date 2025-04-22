import { NextRequest, NextResponse } from 'next/server';
import { getBooleanSetting, SETTINGS } from '@/lib/settings';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic'; // Always run the maintenance check
export const fetchCache = 'force-no-store'; // Never cache this API response
export const revalidate = 0; // Never use cached version 

export async function GET(request: NextRequest) {
  try {
    // Fetch maintenance mode status from settings
    const maintenanceMode = await getBooleanSetting(SETTINGS.MAINTENANCE_MODE, false);
    
    // Return the result
    return NextResponse.json({
      maintenance: maintenanceMode,
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error checking maintenance mode:', error);
    
    // In case of error, assume site is in normal operation
    return NextResponse.json({
      maintenance: false,
      error: 'Error checking maintenance mode',
      timestamp: Date.now()
    });
  }
} 