import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables first
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

import { query } from '../lib/db';
import logger from '../lib/logger';

async function createWhatsAppLogsTable() {
  try {
    // Drop the existing table if it exists
    await query('DROP TABLE IF EXISTS whatsapp_logs');
    
    // Create the table with the correct structure
    await query(`
      CREATE TABLE whatsapp_logs (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(255),
        instance_id VARCHAR(100),
        recipient VARCHAR(100),
        message TEXT,
        booking_id VARCHAR(100),
        status VARCHAR(50) DEFAULT 'pending',
        error TEXT,
        message_type VARCHAR(50),
        chat_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb
      )
    `);
    
    logger.info('WhatsApp logs table created successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Failed to create WhatsApp logs table:', error);
    process.exit(1);
  }
}

createWhatsAppLogsTable(); 