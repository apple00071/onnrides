import { sql } from '@vercel/postgres';
import { readFileSync } from 'fs';
import { join } from 'path';
import logger from '../logger';

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Read the migration file
    const migrationPath = join(__dirname, '001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');

    // Run the migrations
    await sql.query(migrationSQL);

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Error running migrations:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export default runMigrations; 