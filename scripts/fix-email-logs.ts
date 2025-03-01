import { config } from 'dotenv';
import { resolve } from 'path';
import { Pool } from 'pg';
import logger from '@/lib/logger';

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

async function fixEmailLogsTable() {
  try {
    logger.info('Starting email_logs table fix...');

    // Drop existing table and recreate with correct structure
    await pool.query(`
      DROP TABLE IF EXISTS email_logs CASCADE;
      
      CREATE TABLE email_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        message_content TEXT NOT NULL,
        status TEXT NOT NULL,
        booking_id TEXT,
        error TEXT,
        message_id TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);
      CREATE INDEX IF NOT EXISTS idx_email_logs_recipient ON email_logs(recipient);
      CREATE INDEX IF NOT EXISTS idx_email_logs_booking_id ON email_logs(booking_id);
      CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
    `);

    logger.info('Email logs table recreated successfully');
  } catch (error) {
    logger.error('Failed to fix email_logs table:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  fixEmailLogsTable()
    .then(() => {
      logger.info('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Script failed:', error);
      process.exit(1);
    });
}

export default fixEmailLogsTable; 