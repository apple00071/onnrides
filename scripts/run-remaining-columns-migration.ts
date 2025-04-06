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
    const migrationFile = path.join(process.cwd(), 'migrations', '20240403_add_remaining_columns.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    logger.info('Running migration to add remaining booking columns...');

    // Execute the migration
    await pool.query(sql);
    
    // Verify columns were added
    const verifyResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name IN ('booking_type', 'created_by', 'notes')
    `);
    
    if (verifyResult.rows.length > 0) {
      logger.info('Migration completed successfully', {
        columns_added: verifyResult.rows.map(row => row.column_name)
      });
    } else {
      logger.warn('Migration completed but columns may not have been added');
    }
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration(); 