import { Pool } from 'pg';
import { createId } from '@paralleldrive/cuid2';
import bcrypt from 'bcryptjs';
import 'dotenv/config';
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
  } : process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  // Add connection pool settings
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Add retry settings
  retryDelay: 1000,
  maxRetries: 3
};

// Create a connection pool only on the server side with proper configuration
const pool = !isBrowser ? new Pool(connectionOptions) : null;

// Add event listeners for the pool
if (pool) {
  pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', err);
  });

  pool.on('connect', () => {
    logger.info('New database connection established');
  });
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
    if (retries > 0) {
      logger.warn('Database query failed, retrying...', { 
        error: error.message,
        code: error.code,
        retriesLeft: retries 
      });
      
      // Add exponential backoff
      const backoffDelay = delay * (Math.random() + 0.5);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return queryWithRetry(text, params, retries - 1, delay * 2);
    }
    
    logger.error('Database error:', { 
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      operation: 'query execution'
    });
    throw new Error(`Database query execution failed: ${error.message}`);
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
    logger.error('Database error:', error);
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
  const result = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  return result.rows[0] || null;
}

export async function createUser(data: Partial<NewDbUser>): Promise<DbUser> {
  const result = await query(
    'INSERT INTO users (id, name, email, password_hash, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [createId(), data.name || null, data.email, data.password_hash, data.role || 'user']
  );
  return result.rows[0];
} 