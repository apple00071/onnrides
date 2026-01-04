import { Pool, QueryResult } from 'pg';
import logger from '@/lib/logger';
import { createId } from '@paralleldrive/cuid2';
import bcrypt from 'bcryptjs';


// Constants for database operations
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const CONNECTION_TIMEOUT = 10000; // 10 seconds

// Create a pool instance
// Using DATABASE_URL which should point to Supabase in the new setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: CONNECTION_TIMEOUT,
  max: Number(process.env.PG_POOL_MAX) || 20,
  idleTimeoutMillis: Number(process.env.PG_POOL_IDLE_TIMEOUT) || 30000,
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
});

// Handle pool connect
pool.on('connect', (client) => {
  logger.debug('New database connection established');
  client.on('error', (err) => {
    logger.error('Database client error:', err);
  });
});

// Define a type for PostgreSQL database errors
interface DatabaseError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
}

// Helper function to handle database errors
function handleDatabaseError(error: DatabaseError, operation: string) {
  const errorDetails = {
    code: error.code,
    detail: error.detail,
    hint: error.hint,
    position: error.position,
    internalPosition: error.internalPosition,
    internalQuery: error.internalQuery,
    where: error.where,
    schema: error.schema,
    table: error.table,
    column: error.column,
    dataType: error.dataType,
    constraint: error.constraint,
    operation
  };

  logger.error('Database error:', errorDetails);

  // Specific error handling based on error codes
  switch (error.code) {
    case '28P01': // Invalid password
      throw new Error('Database authentication failed. Please check credentials.');
    case '3D000': // Database does not exist
      throw new Error('Database does not exist.');
    case '57P03': // Database connection being closed
      throw new Error('Database connection is being closed.');
    case '57P01': // Database shutting down
      throw new Error('Database server is shutting down.');
    case '08006': // Connection failure
      throw new Error('Unable to connect to the database server.');
    case '08001': // Unable to establish connection
      throw new Error('Unable to establish database connection.');
    default:
      throw new Error(`Database ${operation} failed: ${error.message}`);
  }
}

// Query function with retry logic
export async function query(text: string, params: any[] = []): Promise<QueryResult> {
  let retries = MAX_RETRIES;
  let lastError: unknown;

  while (retries > 0) {
    try {
      const start = Date.now();
      const result = await pool.query(text, params);
      const duration = Date.now() - start;

      logger.debug('Executed query', {
        text: text.substring(0, 50) + '...',
        duration,
        rows: result.rowCount,
        retriesLeft: retries
      });

      return result;
    } catch (error: unknown) {
      lastError = error;
      retries--;

      if (retries > 0) {
        logger.warn('Database query failed, retrying...', {
          error: error instanceof Error ? error.message : 'Unknown error',
          code: (error as DatabaseError).code || 'UNKNOWN',
          retriesLeft: retries
        });
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  handleDatabaseError(lastError as DatabaseError, 'query execution');
  throw lastError; // This line will never be reached due to handleDatabaseError throwing
}

// Initialize database connection
export async function initializeDatabase(): Promise<boolean> {
  try {
    // Test the connection
    const result = await query('SELECT NOW()');
    if (result.rows.length > 0) {
      logger.info('Database connection successful');
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Failed to initialize database:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any).code
    });
    return false;
  }
}

// Close database pool
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    logger.info('Database pool closed successfully');
  } catch (error) {
    logger.error('Error closing database pool:', error);
  }
}

export { pool };

export type DbUser = {
  id: string;
  name: string | null;
  email: string;
  password_hash: string;
  role: 'user' | 'admin' | 'delivery_partner';
  phone: string | null;
  reset_token: string | null;
  reset_token_expiry: Date | null;
  is_blocked: boolean;
  created_at: Date;
  updated_at: Date;
};

export type NewDbUser = Omit<DbUser, 'id' | 'created_at' | 'updated_at' | 'is_blocked'>;

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const result = await query('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  return result.rows[0] || null;
}

export async function createUser(data: Partial<NewDbUser>): Promise<DbUser> {
  const result = await query(
    'INSERT INTO users (id, name, email, password_hash, role, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [createId(), data.name || null, data.email, data.password_hash, data.role || 'user', data.phone || null]
  );
  return result.rows[0];
}

export default { query, pool, initializeDatabase, closePool, findUserByEmail, createUser };
