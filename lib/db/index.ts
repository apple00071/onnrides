import { sql } from '@vercel/postgres';
import { createId } from '@paralleldrive/cuid2';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
import { Pool } from 'pg';
import logger from '@/lib/logger';

// Load environment variables
if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export type QueryResult<T> = {
  rows: T[];
};

export type DbUser = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  phone: string | null;
  reset_token: string | null;
  reset_token_expiry: Date | null;
  is_blocked: boolean;
  created_at: Date;
  updated_at: Date;
};

export type NewDbUser = Omit<DbUser, 'id' | 'created_at' | 'updated_at'>;

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
  delay = 500
): Promise<any> {
  try {
    return await pool.query(text, params);
  } catch (error) {
    if (retries > 0 && error instanceof Error) {
      // Check if error is a connection error
      if (error.message.includes('connection') || error.message.includes('timeout')) {
        logger.warn(`Query attempt ${4-retries} failed, retrying in ${delay}ms...`, { error });
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
    const client = await pool.connect();
    logger.debug('New database connection established');
    try {
      const result = await queryWithRetry(text, params);
      logger.debug('Database query completed', { 
        query: text,
        params,
        duration: result.duration
      });
      return result;
    } catch (error) {
      logger.error('Database query error:', { error, query: text, params });
      throw error;
    } finally {
      client.release();
      logger.debug('Database client connection ended');
    }
  } catch (error) {
    logger.error('Database connection error:', error);
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

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const result = await sql<DbUser>`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return result.rows[0] || null;
}

export async function createUser(data: Partial<NewDbUser>): Promise<DbUser> {
  const result = await sql<DbUser>`
    INSERT INTO users (id, name, email, password_hash, role) 
    VALUES (${createId()}, ${data.name || null}, ${data.email}, ${data.password_hash}, ${data.role || 'user'}) 
    RETURNING *
  `;
  return result.rows[0];
}

export { sql }; 