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
    }, { status: 200 });
  } catch (error: any) {
    logger.error('Error checking maintenance mode:', error);
    
    // Return a proper error response
    return NextResponse.json({
      maintenance: false,
      error: 'Error checking maintenance mode',
      timestamp: Date.now(),
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    }, { status: 500 });
  }
} 