import pg, { QueryResult, QueryResultRow } from 'pg';
const { Pool } = pg;
import logger from '@/lib/logger';
import { createId } from '@paralleldrive/cuid2';

// Constants for database operations
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;
const CONNECTION_TIMEOUT = 10000;

// Create a pool instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: CONNECTION_TIMEOUT,
  max: Number(process.env.PG_POOL_MAX) || 20,
  idleTimeoutMillis: Number(process.env.PG_POOL_IDLE_TIMEOUT) || 30000,
});

pool.on('error', (err) => logger.error('Unexpected database pool error:', err));
pool.on('connect', (client) => {
  logger.debug('New database connection established');
  client.on('error', (err) => logger.error('Database client error:', err));
});

interface DatabaseError extends Error {
  code?: string;
  detail?: string;
}

function handleDatabaseError(error: DatabaseError, operation: string) {
  logger.error('Database error:', { code: error.code, detail: error.detail, operation });
  throw new Error(`Database ${operation} failed: ${error.message}`);
}

// Fixed: Explicit function with generic for query to ensure it works correctly with named exports and type parameters
export async function query<T extends QueryResultRow = any>(text: string, params: any[] = []): Promise<QueryResult<T>> {
  let retries = MAX_RETRIES;
  let lastError: unknown;

  while (retries > 0) {
    try {
      const start = Date.now();
      const result = await pool.query<T>(text, params);
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
          retriesLeft: retries
        });
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  handleDatabaseError(lastError as DatabaseError, 'query execution');
  throw lastError;
};

export async function withTransaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function initializeDatabase(): Promise<boolean> {
  try {
    const result = await query('SELECT NOW()');
    return result.rows.length > 0;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    return false;
  }
}

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
  is_blocked: boolean;
};

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const result = await query<DbUser>('SELECT * FROM users WHERE email = $1 LIMIT 1', [email]);
  return result.rows[0] || null;
}

export async function createUser(data: Partial<DbUser>): Promise<DbUser> {
  const result = await query<DbUser>(
    'INSERT INTO users (id, name, email, password_hash, role, phone) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
    [createId(), data.name || null, data.email, data.password_hash, data.role || 'user', data.phone || null]
  );
  return result.rows[0];
}

// Export as default for backward compatibility
export const db = { query, pool, initializeDatabase, closePool, findUserByEmail, createUser, withTransaction };
export default db;
