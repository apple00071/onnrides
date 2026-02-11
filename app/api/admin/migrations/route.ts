import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // S-Verify: Standardized admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    logger.info('Starting database migrations...');

    // Fixed: Replaced invalid template literal query usage with standard function calls
    // Create vehicle_status enum type
    await query(`
      DO $$ BEGIN
        CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'retired');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create booking_status enum type
    await query(`
      DO $$ BEGIN
        CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Create payment_status enum type
    await query(`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

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