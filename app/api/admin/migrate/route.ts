import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting database migration...');
    
    // Add min_booking_hours column using raw SQL
    await query(`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS min_booking_hours INTEGER NOT NULL DEFAULT 12
    `);

    logger.info('Migration completed successfully');

    return NextResponse.json({
      message: 'Migration completed successfully'
    });

  } catch (error) {
    logger.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed' },
      { status: 500 }
    );
  }
} 