import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import { verifyAuth } from '@/lib/auth';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await verifyAuth();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get table info using raw SQL
    const tableInfo = await db.select().from(
      sql.raw(`
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'vehicles'
      `)
    );

    const databaseInfo = {
      tables: {
        vehicles: {
          columns: tableInfo
        }
      }
    };

    return NextResponse.json(databaseInfo);
  } catch (error) {
    logger.error('Database debug info error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch database debug info' },
      { status: 500 }
    );
  }
} 