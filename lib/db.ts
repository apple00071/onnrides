import { Pool, QueryResult } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from './schema';
import logger from './logger';

// Parse and validate the connection string
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Neon specific pool configuration optimized for serverless
const pool = new Pool({
  connectionString,
  ssl: true,
  max: 1, // Use a single connection in the pool
  min: 0,
  idleTimeoutMillis: 15000, // Close idle connections after 15 seconds
  connectionTimeoutMillis: 10000, // Connection timeout 10 seconds
  allowExitOnIdle: true,
  application_name: 'onnrides',
  keepAlive: false, // Disable keepalive for serverless
});

// Handle pool errors
pool.on('error', (err: Error) => {
  logger.error('Unexpected database pool error:', err);
});

// Log when a connection is acquired
pool.on('connect', () => {
  logger.debug('New database connection established');
});

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      logger.info('Database initialized successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Failed to initialize database:', error);
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
  try {
    const start = Date.now();
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    logger.debug('Executed query', { text, duration, rows: result.rowCount });
    return result;
  } catch (error) {
    logger.error('Database query error:', error);
    throw error;
  }
}

// Export functions for direct pool access if needed
export default {
  query,
  pool,
  initializeDatabase,
}; 