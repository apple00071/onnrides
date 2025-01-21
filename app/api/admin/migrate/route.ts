import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Add min_booking_hours column
    await db.execute(sql`
      ALTER TABLE vehicles 
      ADD COLUMN IF NOT EXISTS min_booking_hours INTEGER NOT NULL DEFAULT 12
    `);

    return NextResponse.json({ message: 'Migration completed successfully' });
  } catch (error) {
    logger.error('Error running migration:', error);
    return NextResponse.json(
      { error: 'Failed to run migration' },
      { status: 500 }
    );
  }
} 