import { sql } from 'drizzle-orm';
import { pgTable, text, json } from 'drizzle-orm/pg-core';

export async function up(db: any) {
  await db.execute(sql`
    ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS payment_id TEXT,
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS payment_details JSONB DEFAULT '{}'::jsonb;

    -- Update payment_status enum
    ALTER TABLE bookings 
    DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

    ALTER TABLE bookings 
    ADD CONSTRAINT bookings_payment_status_check 
    CHECK (payment_status IN ('pending', 'paid', 'refunded', 'failed'));
  `);
}

export async function down(db: any) {
  await db.execute(sql`
    ALTER TABLE bookings
    DROP COLUMN IF EXISTS payment_id,
    DROP COLUMN IF EXISTS payment_method,
    DROP COLUMN IF EXISTS payment_details;

    -- Revert payment_status enum
    ALTER TABLE bookings 
    DROP CONSTRAINT IF EXISTS bookings_payment_status_check;

    ALTER TABLE bookings 
    ADD CONSTRAINT bookings_payment_status_check 
    CHECK (payment_status IN ('pending', 'paid', 'refunded'));
  `);
} 