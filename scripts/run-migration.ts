import { query } from '@/lib/db';
import { logger } from '@/lib/logger';

async function runMigration() {
  try {
    logger.info('Starting migration to update payment_details column');

    // First, add the column if it doesn't exist (as TEXT initially)
    await query(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 
              FROM information_schema.columns 
              WHERE table_name = 'bookings' 
              AND column_name = 'payment_details'
          ) THEN
              ALTER TABLE bookings 
              ADD COLUMN payment_details TEXT;
          END IF;
      END $$;
    `);
    logger.info('Added payment_details column if it did not exist');

    // Convert existing TEXT data to valid JSON if any exists
    await query(`
      UPDATE bookings 
      SET payment_details = '{}' 
      WHERE payment_details IS NULL OR payment_details = '';
    `);
    logger.info('Initialized empty payment_details');

    // Alter the column type to JSONB
    await query(`
      ALTER TABLE bookings 
      ALTER COLUMN payment_details TYPE JSONB 
      USING COALESCE(payment_details::jsonb, '{}');
    `);
    logger.info('Converted payment_details to JSONB');

    // Set default value
    await query(`
      ALTER TABLE bookings 
      ALTER COLUMN payment_details 
      SET DEFAULT '{}'::jsonb;
    `);
    logger.info('Set default value for payment_details');

    logger.info('Migration completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration(); 