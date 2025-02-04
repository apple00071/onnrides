import { sql } from '@vercel/postgres';
import { logger } from '@/lib/logger';

export async function migrate() {
  try {
    logger.info('Running migration: add payment_intent_id to bookings table');
    
    // Add payment_intent_id column
    await sql`
      ALTER TABLE bookings
      ADD COLUMN IF NOT EXISTS payment_intent_id TEXT;
    `;
    
    // Create index
    await sql`
      CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent_id 
      ON bookings(payment_intent_id);
    `;
    
    logger.info('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
} 