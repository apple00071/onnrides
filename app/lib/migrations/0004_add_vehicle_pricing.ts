import { sql } from 'drizzle-orm';

export async function up(db: any) {
  await db.execute(sql`
    ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS price_12hrs DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS price_24hrs DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS price_7days DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS price_15days DECIMAL(10,2),
    ADD COLUMN IF NOT EXISTS price_30days DECIMAL(10,2);
  `);
}

export async function down(db: any) {
  await db.execute(sql`
    ALTER TABLE vehicles
    DROP COLUMN IF EXISTS price_12hrs,
    DROP COLUMN IF EXISTS price_24hrs,
    DROP COLUMN IF EXISTS price_7days,
    DROP COLUMN IF EXISTS price_15days,
    DROP COLUMN IF EXISTS price_30days;
  `);
} 