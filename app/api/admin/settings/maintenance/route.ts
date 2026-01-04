import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT * FROM settings WHERE key = $1 LIMIT 1`,
      ['maintenance_mode']
    );

    const setting = result.rows[0];

    return NextResponse.json({
      maintenanceMode: setting?.value === 'true'
    });
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

    // Update the maintenance mode in database
    await query(
      `UPDATE settings SET value = $1, updated_at = $2 WHERE key = $3`,
      [String(maintenanceMode), new Date(), 'maintenance_mode']
    );

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