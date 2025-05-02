import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET /api/settings/maintenance - Get maintenance mode status
export async function GET() {
  try {
    const maintenanceStatus = await prisma.settings.findFirst({
      where: {
        key: 'maintenance_mode'
      }
    });

    return NextResponse.json({
      success: true,
      maintenance: maintenanceStatus?.value === 'true'
    });
  } catch (error) {
    logger.error('Error getting maintenance mode:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get maintenance mode status' },
      { status: 500 }
    );
  }
}

// POST /api/settings/maintenance - Toggle maintenance mode
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const data = await request.json();
    const { enabled } = data;

    // Update or create maintenance mode setting
    const maintenanceStatus = await prisma.settings.upsert({
      where: {
        key: 'maintenance_mode'
      },
      update: {
        value: String(enabled),
        updated_at: new Date()
      },
      create: {
        id: 'maintenance_mode',
        key: 'maintenance_mode',
        value: String(enabled)
      }
    });

    logger.info('Maintenance mode updated:', {
      enabled,
      updatedBy: session.user.email
    });

    return NextResponse.json({
      success: true,
      maintenance: maintenanceStatus.value === 'true'
    });
  } catch (error) {
    logger.error('Error updating maintenance mode:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update maintenance mode' },
      { status: 500 }
    );
  }
} 