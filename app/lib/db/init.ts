import { query } from '@/lib/db';
import logger from '@/lib/logger';
import fs from 'fs';
import path from 'path';

export async function initializeDatabase() {
  try {
    // Create WhatsApp logs table
    const whatsappLogsSql = `
      CREATE TABLE IF NOT EXISTS whatsapp_logs (
        id SERIAL PRIMARY KEY,
        message_id VARCHAR(255),
        instance_id VARCHAR(100),
        recipient_phone VARCHAR(20),
        message_type VARCHAR(50),
        message_content TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        metadata JSONB DEFAULT '{}'::jsonb
      );
    `;

    await query(whatsappLogsSql);
    logger.info('WhatsApp logs table initialized successfully');

  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  }
} 