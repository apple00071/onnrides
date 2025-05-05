import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test database connection using query function
    const result = await query('SELECT NOW()');
    const currentTime = result.rows[0].now;

    logger.info('Health check passed', {
      dbConnected: true,
      timestamp: currentTime
    });

    return NextResponse.json({
      status: 'healthy',
      database: {
        connected: true,
        timestamp: currentTime
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Health check failed:', error);

    return NextResponse.json({
      status: 'unhealthy',
      database: {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
} 