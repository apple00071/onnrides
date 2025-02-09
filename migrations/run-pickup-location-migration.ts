import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
  try {
    logger.info('Starting pickup_location migration...');

    // Read the SQL file
    const sqlPath = join(process.cwd(), 'migrations', 'add_pickup_location_to_bookings.sql');
    const sql = readFileSync(sqlPath, 'utf8');

    // Run the migration
    await query(sql);

    logger.info('Successfully added pickup_location to bookings table');
  } catch (error) {
    logger.error('Error running pickup_location migration:', error);
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    logger.info('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Migration failed:', error);
    process.exit(1);
  }); 