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
const RETRY_DELAY = 1000; // 1 second

// Create a connection pool
const pool = new Pool({
  connectionString,
  ssl: true,
  // Connection pool configuration
  max: 10, // Reduce max connections
  idleTimeoutMillis: 60000, // 1 minute
  connectionTimeoutMillis: 10000, // 10 seconds
  // Add additional connection options
  application_name: 'onnrides-app',
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
  statement_timeout: 10000, // 10 seconds
  query_timeout: 10000    // 10 seconds
});

// Test the connection
pool.on('connect', () => {
  logger.info('Connected to database');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error:', err);
  // Try to reconnect
  setTimeout(() => {
    logger.info('Attempting to reconnect to database...');
    pool.connect();
  }, 5000);
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

// Enhanced pool status monitoring
setInterval(() => {
  const status = {
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount
  };
  
  if (status.waiting > 0) {
    logger.warn('Database connection pool has waiting clients', status);
    // Try to recover if there are waiting clients
    pool.connect().catch(err => {
      logger.error('Failed to establish new connection:', err);
    });
  } else {
    logger.debug('Database connection pool status', status);
  }
}, 30000); // Check every 30 seconds

// Initialize database connection
async function initializeDatabase(): Promise<void> {
  try {
    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        is_blocked BOOLEAN DEFAULT false,
        last_login TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

// Create Kysely instance
const db = new Kysely<Database>({
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
  try {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;

    if (duration > 1000) {
      logger.warn('Slow query detected', {
        duration,
        text: text.substring(0, 100), // Log only first 100 chars
        rows: result.rowCount,
        params
      });
    }

    return result;
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      if (retries > 0) {
        logger.warn('Database connection failed, retrying...', {
          retriesLeft: retries - 1,
          error: error.message
        });
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return queryWithRetry(text, params, retries - 1);
      }
    }
    throw error;
  }
}

// Query function for direct pool access
async function query(text: string, params?: any[]): Promise<QueryResult> {
  try {
    return await queryWithRetry(text, params);
  } catch (error) {
    logger.error('Database query error:', {
      error,
      query: text.substring(0, 100), // Log only first 100 chars
      params,
      timestamp: new Date().toISOString()
    });
    throw error;
  }
}

// Function to safely end the pool
async function closePool(): Promise<void> {
  try {
    await pool.end();
    logger.info('Database pool closed');
  } catch (error) {
    logger.error('Error closing database pool:', error);
    throw error;
  }
}

// Initialize database on module load
initializeDatabase().catch(error => {
  logger.error('Failed to initialize database on startup:', error);
  process.exit(1);
});

// Export everything needed
export {
  pool,
  initializeDatabase,
  query,
  closePool,
  db
}; 