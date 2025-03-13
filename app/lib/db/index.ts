import { Pool } from 'pg';
import logger from '@/lib/logger';

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

// Function to execute a query with retries
async function queryWithRetry(
  text: string,
  params?: any[],
  retries = 3,
  delay = 1000
): Promise<any> {
  try {
    return await pool.query(text, params);
  } catch (error) {
    if (retries > 0 && error instanceof Error) {
      // Check if error is a connection error
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        await new Promise(resolve => setTimeout(resolve, delay));
        return queryWithRetry(text, params, retries - 1, delay * 2);
      }
    }
    throw error;
  }
}

// Export the query function
export async function query(text: string, params?: any[]) {
  try {
    return await queryWithRetry(text, params);
  } catch (error) {
    logger.error('Database query error:', { error, query: text, params });
    throw error;
  }
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    // Create WhatsApp logs table
    await query(`
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
    `);

    logger.info('Database tables initialized successfully');
  } catch (error) {
    logger.error('Error initializing database tables:', error);
    throw error;
  }
}

// Export the pool for direct access if needed
export { pool }; 