 import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export const revalidate = 60; // Cache for 60 seconds

export async function GET() {
  try {
    const setting = await prisma.settings.findUnique({
      where: {
        key: 'maintenance_mode'
      }
    });

    return NextResponse.json({
      maintenanceMode: setting?.value === 'true'
    });
  } catch (error) {
    logger.error('Error checking maintenance mode:', error);
    return NextResponse.json({
      maintenanceMode: false
    });
  }
} 