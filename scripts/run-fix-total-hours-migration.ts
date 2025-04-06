import { config } from 'dotenv';
config(); // Load environment variables from .env file

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import logger from '../lib/logger';

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    const migrationFile = path.join(process.cwd(), 'migrations', '20240403_fix_total_hours_column.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    logger.info('Running migration to fix total_hours column...');

    // Execute the migration
    await pool.query(sql);
    
    // Verify the column was updated
    const verifyResult = await pool.query(`
      SELECT column_name, is_nullable, data_type
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name = 'total_hours'
    `);
    
    if (verifyResult.rows.length > 0) {
      logger.info('Migration completed successfully', {
        total_hours_column_info: verifyResult.rows[0]
      });
    } else {
      logger.warn('Migration completed but total_hours column not found');
    }
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration(); 