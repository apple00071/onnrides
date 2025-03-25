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
    const migrationFile = path.join(process.cwd(), 'migrations', '20240325_create_password_resets.sql');
    const sql = fs.readFileSync(migrationFile, 'utf8');

    logger.info('Running migration:', { file: migrationFile });

    // Execute the entire SQL file as one statement
    await pool.query(sql);
    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration(); 