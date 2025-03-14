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

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

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

// Create a connection pool only on the server side
const pool = !isBrowser ? new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
}) : null;

// Function to execute a query with retries
async function queryWithRetry(
  text: string,
  params?: any[],
  retries = 3,
  delay = 1000
): Promise<any> {
  if (isBrowser) {
    throw new Error('Database operations are not available in the browser');
  }

  try {
    return await pool?.query(text, params);
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
  if (isBrowser) {
    throw new Error('Database operations are not available in the browser');
  }

  try {
    return await queryWithRetry(text, params);
  } catch (error) {
    logger.error('Database query error:', { error, query: text, params });
    throw error;
  }
}

// Initialize database tables
export async function initializeDatabase() {
  if (isBrowser) {
    throw new Error('Database operations are not available in the browser');
  }

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

// Export the pool for direct access if needed (server-side only)
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