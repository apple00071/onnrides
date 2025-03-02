import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    logger.info('Settings initialization mock endpoint called');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Settings mock initialization successful',
      mockResponse: true
    });
  } catch (error) {
    logger.error('Error in mock settings initialization:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Mock error response'
    }, { status: 500 });
  }
} 