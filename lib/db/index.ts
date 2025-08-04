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

// Parse database URL to determine if it's a Neon database
const isNeonDb = process.env.DATABASE_URL.includes('.neon.tech');

// Configure connection options
const connectionOptions = {
  connectionString: process.env.DATABASE_URL,
  ssl: isNeonDb ? {
    rejectUnauthorized: true,
    // For Neon, we need to ensure we're using TLS
    ssl: true,
  } : process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
};

// Create a connection pool only on the server side with proper configuration
const pool = !isBrowser ? new Pool({
  ...connectionOptions,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait before timing out when connecting a new client
}) : null;

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
    const client = await pool?.connect();
    try {
      const result = await client?.query(text, params);
      return result;
    } finally {
      client?.release();
    }
  } catch (error: any) {
    logger.warn('Database query failed, retrying...', { 
      error: error.message,
      code: error.code,
      retriesLeft: retries 
    });
    
    if (retries > 0) {
      // Add exponential backoff
      const backoffDelay = delay * (Math.random() + 0.5); // Random delay between 0.5x and 1.5x
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return queryWithRetry(text, params, retries - 1, delay * 2);
    }
    
    logger.error('Database error:', { 
      code: error.code,
      operation: 'query execution'
    });
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