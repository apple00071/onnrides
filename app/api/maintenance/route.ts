import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    // Get maintenance mode setting using direct query
    const result = await query(`
      SELECT value FROM settings 
      WHERE key = 'maintenance_mode' 
      LIMIT 1
    `);

    const maintenanceStatus = result.rows[0];
    
    return NextResponse.json({
      maintenance: maintenanceStatus?.value === 'true',
      timestamp: Date.now()
    });
  } catch (error) {
    logger.error('Error checking maintenance mode:', error);
    
    return NextResponse.json({
      maintenance: false,
      error: 'Error checking maintenance mode',
      timestamp: Date.now()
    });
  }
} 