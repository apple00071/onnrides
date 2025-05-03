import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

// GET /api/settings/maintenance - Get maintenance mode status
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

    // Update maintenance mode setting using the query helper
    const result = await query(`
      INSERT INTO settings (id, key, value, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = $3, "updatedAt" = NOW()
      RETURNING value
    `, ['maintenance_mode', 'maintenance_mode', String(enabled)]);

    const maintenanceStatus = result.rows[0];

    logger.info('Maintenance mode updated:', {
      enabled,
      updatedBy: session.user.email
    });

    return NextResponse.json({
      success: true,
      maintenance: maintenanceStatus?.value === 'true'
    });
  } catch (error) {
    logger.error('Error updating maintenance mode:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update maintenance mode' },
      { status: 500 }
    );
  }
} 