import { Pool, QueryResult } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from './schema';
import logger from './logger';
import { configureGlobalTimezone, configureDatabaseTimezone } from './utils/timezone-config';

// Parse and validate the connection string
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

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
  // Add additional connection options
  application_name: 'onnrides-app',
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000, // 10 seconds before first keepalive
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected error on idle client', err);
  // Don't exit the process, try to keep the app running
  // process.exit(-1);
});

// Handle pool connection events
pool.on('connect', (client) => {
  logger.debug('New database connection established');
  
  client.on('error', (err) => {
    logger.error('Database client error:', err);
  });
  
  client.on('end', () => {
    logger.debug('Database client connection ended');
  });
});

// Pool status monitoring
setInterval(() => {
  const status = {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  };
  
  if (status.waiting > 0) {
    logger.warn('Database connection pool has waiting clients', status);
  } else {
    logger.debug('Database connection pool status', status);
  }
}, 60000); // Log every minute

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  let retries = 0;
  let lastError;
  
  // Configure global timezone settings
  await configureGlobalTimezone();
  
  while (retries < MAX_RETRIES) {
    try {
      const client = await pool.connect();
      try {
        await client.query('SELECT NOW()');
        logger.info('Database connection established');
        
        // Configure timezone settings for the database pool
        await configureDatabaseTimezone(pool);
        
        return;
      } finally {
        client.release();
      }
    } catch (error: any) {
      lastError = error;
      retries++;
      logger.error(`Database initialization attempt ${retries} failed:`, error);
      
      if (retries < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * retries;
        logger.info(`Retrying database connection in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Failed to connect to the database after multiple retries');
}

// Create and export Kysely instance
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool
  }),
});

// Helper function to retry a query with backoff
async function queryWithRetry(
  text: string, 
  params?: any[], 
  retries = MAX_RETRIES
): Promise<QueryResult> {
  let lastError;
  let attempt = 0;
  
  while (attempt < retries) {
    try {
      return await pool.query(text, params);
    } catch (error: any) {
      lastError = error;
      attempt++;
      
      const isRetryableError = 
        error.code === '08006' || // connection_failure
        error.code === '08001' || // unable_to_connect
        error.code === 'XX000' || // internal_error
        error.code === '08003' || // connection_does_not_exist
        error.code === '08004' || // connection_rejected
        error.code === '08007' || // transaction_resolution_unknown
        error.message?.includes('Connection terminated') ||
        error.message?.includes('Connection timed out') ||
        error.message?.includes('Closed');
      
      if (!isRetryableError || attempt >= retries) {
        throw error;
      }
      
      const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
      logger.warn(`Query attempt ${attempt} failed, retrying in ${delay}ms...`, {
        error: error.message,
        code: error.code
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Export query function for direct pool access
export async function query(text: string, params?: any[]): Promise<QueryResult> {
  const start = Date.now();
  try {
    // Log the query details before execution
    logger.debug('Executing query:', {
      text,
      params,
      paramTypes: params?.map(p => typeof p)
    });

    const result = await queryWithRetry(text, params);
    
    const duration = Date.now() - start;
    if (duration > 500) {
      logger.warn('Slow query detected', {
        text,
        duration,
        rows: result.rowCount
      });
    } else {
      logger.debug('Executed query', {
        text,
        duration,
        rows: result.rowCount
      });
    }
    
    return result;
  } catch (error) {
    logger.error('Database query error:', {
      error,
      query: text,
      params,
      duration: Date.now() - start
    });
    throw error;
  }
}

// Export a function to safely end the pool
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    logger.info('Database pool closed successfully');
  } catch (error: any) {
    // Don't throw if it's already being closed
    if (error.message !== 'Called end on pool more than once') {
      logger.error('Error closing database pool:', error);
      throw error;
    }
  }
}

// Export pool for direct access if needed
export { pool };

// Export functions for direct pool access if needed
export default {
  query,
  initializeDatabase,
  closePool,
}; 