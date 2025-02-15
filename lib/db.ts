import { Pool, QueryResult, QueryResultRow } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from './schema';
import logger from './logger';

// Parse the connection string
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create the connection pool
const pool = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false }
    : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the database connection
pool.on('connect', () => {
  logger.info('Database connected successfully');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
});

// Verify the connection immediately
(async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    logger.info('Database connection verified:', result.rows[0]);
    client.release();
  } catch (error) {
    logger.error('Failed to verify database connection:', error);
    process.exit(1);
  }
})();

// Export a function to execute queries
export async function query<T extends QueryResultRow = any>(
  text: string, 
  params: any[] = []
): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const result = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    
    logger.debug('Executed query', {
      text,
      duration,
      rows: result.rowCount
    });

    return result;
  } catch (error) {
    logger.error('Error executing query', {
      text,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - start
    });
    throw error;
  }
}

// Export the pool for direct access if needed
export { pool };

// Create and export a Kysely instance
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool
  })
}); 