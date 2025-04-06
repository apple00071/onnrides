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
    const migrationFile = path.join(process.cwd(), 'migrations', '20240403_fix_id_column.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    logger.info('Running migration to fix id column...');

    // Execute the migration
    await pool.query(sql);
    
    // Verify the column was updated
    const verifyResult = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name = 'id'
    `);
    
    if (verifyResult.rows.length > 0) {
      logger.info('Migration completed successfully', {
        id_column_info: verifyResult.rows[0]
      });
    } else {
      logger.warn('Migration completed but id column not found');
    }
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration(); 