import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import logger from '@/lib/logger';

export async function POST() {
  try {
    // Create vehicle_status enum type
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'retired');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Add all required columns
    await db.execute(sql`
      -- Add status column
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status vehicle_status NOT NULL DEFAULT 'active';

      -- Add timestamp columns
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

      -- Add price columns
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS price_per_hour DECIMAL(10,2);
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS price_12hrs DECIMAL(10,2);
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS price_24hrs DECIMAL(10,2);
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS price_7days DECIMAL(10,2);
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS price_15days DECIMAL(10,2);
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS price_30days DECIMAL(10,2);

      -- Add other required columns
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS min_booking_hours INTEGER NOT NULL DEFAULT 12;
      ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;
    `);

    return NextResponse.json({ message: 'Migration completed successfully' });
  } catch (error) {
    logger.error('Migration failed:', error);
    return NextResponse.json(
      { message: 'Migration failed', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 