import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import logger from '@/lib/logger';
import { Settings } from '@/lib/schema';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const setting = await db
      .selectFrom('settings')
      .selectAll()
      .where('key', '=', 'maintenance_mode')
      .executeTakeFirst();

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
    await db
      .updateTable('settings')
      .set({
        value: String(maintenanceMode),
        updated_at: new Date()
      } as Partial<Settings>)
      .where('key', '=', 'maintenance_mode')
      .execute();

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