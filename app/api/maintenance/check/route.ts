import { NextResponse } from 'next/server';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic'; // Always run the maintenance check

export async function GET() {
  try {
    // Simple hardcoded response to ensure API works properly
    return NextResponse.json({ 
      maintenance: false,
      hardcoded: true
    });
  } catch (error) {
    logger.error('Error in simplified maintenance check:', error);
    return NextResponse.json({ 
      maintenance: false,
      error: 'Error occurred'
    });
  }
} 