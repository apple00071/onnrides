import { Pool } from 'pg';
import logger from '@/lib/logger';

async function runMigration() {
  // Get database configuration from environment variables
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  // Create a new pool
  const pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Add booking_id column
    await pool.query(`
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_id VARCHAR(5) UNIQUE;
    `);
    logger.info('Added booking_id column');

    // Update existing bookings with generated booking IDs
    await pool.query(`
      UPDATE bookings 
      SET booking_id = 'OR' || SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 3)
      WHERE booking_id IS NULL;
    `);
    logger.info('Updated existing bookings with booking IDs');

    // Make booking_id NOT NULL
    await pool.query(`
      ALTER TABLE bookings ALTER COLUMN booking_id SET NOT NULL;
    `);
    logger.info('Set booking_id as NOT NULL');

    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration(); 