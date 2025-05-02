import { NextResponse } from 'next/server';
import { prisma, connectPrisma, disconnectPrisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET() {
  try {
    // Ensure database connection
    await connectPrisma();
    
    // Fetch maintenance mode status using Prisma
    const setting = await prisma.settings.findUnique({
      where: {
        key: 'maintenance_mode'
      }
    });
    
    // Return the result
    return NextResponse.json({
      maintenance: setting?.value === 'true',
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
  } finally {
    // Always disconnect after the operation
    await disconnectPrisma();
  }
} 