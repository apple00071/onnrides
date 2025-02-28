import { Pool, QueryResult } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from './schema';
import logger from './logger';

// Parse and validate the connection string
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a connection pool
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined,
  // Connection pool configuration
  max: Number(process.env.PG_POOL_MAX) || 20,
  idleTimeoutMillis: Number(process.env.PG_POOL_IDLE_TIMEOUT) || 30000,
  connectionTimeoutMillis: Number(process.env.PG_POOL_CONNECTION_TIMEOUT) || 10000,
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Handle pool connection errors
pool.on('connect', (client) => {
  client.on('error', (err) => {
    logger.error('Database client error:', err);
  });
});

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      logger.info('Database connection established');
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error initializing database:', error);
    throw error;
  }
}

// Create and export Kysely instance
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool
  }),
});

// Export query function for direct pool access
export async function query<T extends Record<string, any>>(
  text: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
}

// Export pool for direct access if needed
export { pool };

// Export functions for direct pool access if needed
export default {
  query,
  initializeDatabase,
}; 