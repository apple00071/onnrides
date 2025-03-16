import { NextResponse, NextRequest } from 'next/server';
import logger from '@/lib/logger';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic'; // Always run the maintenance check
export const fetchCache = 'force-no-store'; // Never cache this API response
export const revalidate = 0; // Never use cached version 

export async function GET(request: NextRequest) {
  try {
    // Get mobile parameter if present
    const url = new URL(request.url);
    const isMobile = url.searchParams.get('mobile') === '1';
    const timestamp = url.searchParams.get('_t') || Date.now().toString();
    
    logger.debug('Maintenance check requested', { 
      isMobile, 
      timestamp,
      userAgent: request.headers.get('user-agent')?.substring(0, 100)
    });
    
    // Check the database for the current maintenance mode setting
    const setting = await db
      .selectFrom('settings')
      .selectAll()
      .where('key', '=', 'maintenance_mode')
      .executeTakeFirst();
    
    const maintenanceMode = setting?.value === 'true';
    
    logger.info('Maintenance check result', { 
      maintenanceMode, 
      isMobile,
      timestamp
    });
    
    // Create response with strong no-cache headers
    const response = NextResponse.json({ 
      maintenance: maintenanceMode,
      timestamp: Date.now(),
      isMobile,
      source: 'database'
    });
    
    // Add strong no-cache headers
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');
    response.headers.set('Surrogate-Control', 'no-store');
    
    return response;
  } catch (error) {
    logger.error('Error in maintenance check:', error);
    
    // If there's an error, default to non-maintenance mode
    const errorResponse = NextResponse.json({ 
      maintenance: false,
      error: 'Error occurred',
      timestamp: Date.now(),
      source: 'error-fallback'
    });
    
    // Add no-cache headers even for errors
    errorResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    errorResponse.headers.set('Pragma', 'no-cache');
    errorResponse.headers.set('Expires', '0');
    
    return errorResponse;
  }
} 