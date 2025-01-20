import { sql } from '@vercel/postgres';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import logger from '../logger';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

async function runMigrations() {
  try {
    logger.info('Starting database migrations...');

    // Get all SQL files in the migrations directory
    const migrationsDir = __dirname;
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // This ensures migrations run in order (001_, 002_, etc.)

    // Run each migration file
    for (const file of migrationFiles) {
      logger.info(`Running migration: ${file}`);
      const migrationPath = join(migrationsDir, file);
      const migrationSQL = readFileSync(migrationPath, 'utf8');

      // Run the migration
      await sql.query(migrationSQL);
      logger.info(`Completed migration: ${file}`);
    }

    logger.info('All database migrations completed successfully');
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