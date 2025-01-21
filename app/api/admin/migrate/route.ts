import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { neon } from '@neondatabase/serverless';
import logger from '@/lib/logger';
import { verifyAuth } from '@/lib/auth';

export async function GET() {
  try {
    const user = await verifyAuth();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting database migration...');

    const sql = neon(process.env.DATABASE_URL!);
    
    // Add min_booking_hours column using raw SQL
    await sql`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS min_booking_hours INTEGER NOT NULL DEFAULT 12
    `;

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