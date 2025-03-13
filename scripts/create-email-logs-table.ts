import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables first
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

import { query } from '../lib/db';
import logger from '../lib/logger';

async function createEmailLogsTable() {
  try {
    // Drop the existing table if it exists
    await query('DROP TABLE IF EXISTS email_logs');
    
    // Create the table with the correct structure
    await query(`
      CREATE TABLE email_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        recipient TEXT NOT NULL,
        subject TEXT NOT NULL,
        message_content TEXT,
        booking_id TEXT,
        status TEXT NOT NULL,
        error TEXT,
        message_id TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    logger.info('Email logs table created successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to create email logs table:', error);
    process.exit(1);
  }
}

createEmailLogsTable(); 