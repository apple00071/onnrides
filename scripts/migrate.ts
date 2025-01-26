import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

async function runMigration() {
  try {
    // Add phone column to users table
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    `);
    console.log('✅ Added phone column to users table');

    // Add location columns to bookings table
    await db.execute(sql`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS pickup_location TEXT,
      ADD COLUMN IF NOT EXISTS dropoff_location TEXT;
    `);
    console.log('✅ Added location columns to bookings table');

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 