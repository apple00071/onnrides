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
    const migrationFile = path.join(process.cwd(), 'migrations', '20240403_add_payment_reference.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    logger.info('Running payment_reference migration...');

    // Execute the migration
    await pool.query(sql);
    
    // Verify the column was added
    const verifyResult = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings' 
      AND column_name = 'payment_reference'
    `);
    
    if (verifyResult.rows.length > 0) {
      logger.info('Migration completed successfully, payment_reference column added');
    } else {
      logger.warn('Migration completed but payment_reference column may not have been added');
    }
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration(); 