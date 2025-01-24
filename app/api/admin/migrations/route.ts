import { NextResponse } from 'next/server';
import { neon } from '@neondatabase/serverless';
import logger from '@/lib/logger';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await verifyAuth();
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting database migrations...');

    const sql = neon(process.env.DATABASE_URL!);
    
    // Create vehicle_status enum type
    await sql`
      DO $$ BEGIN
        CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'retired');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // Create booking_status enum type
    await sql`
      DO $$ BEGIN
        CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // Create payment_status enum type
    await sql`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    logger.info('Migrations completed successfully');

    return NextResponse.json({
      message: 'Migrations completed successfully'
    });

  } catch (error) {
    logger.error('Migration error:', error);
    return NextResponse.json(
      { error: 'Migration failed' },
      { status: 500 }
    );
  }
} 