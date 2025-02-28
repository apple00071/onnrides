import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const maintenanceMode = process.env.MAINTENANCE_MODE === 'true';
    return NextResponse.json({ maintenanceMode });
  } catch (error) {
    logger.error('Error fetching maintenance mode status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch maintenance mode status' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { maintenanceMode } = await request.json();

    // Update the environment variable
    process.env.MAINTENANCE_MODE = String(maintenanceMode);

    return NextResponse.json({
      success: true,
      maintenanceMode: maintenanceMode
    });
  } catch (error) {
    logger.error('Error updating maintenance mode:', error);
    return NextResponse.json(
      { error: 'Failed to update maintenance mode' },
      { status: 500 }
    );
  }
} 