import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from './schema';
import logger from './logger';

function parseConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    return {
      user: url.username,
      password: url.password,
      host: url.hostname,
      database: url.pathname.split('/')[1],
      ssl: true,
      port: url.port ? parseInt(url.port) : 5432,
    };
  } catch (error) {
    throw new Error('Invalid database connection string');
  }
}

function getDatabaseConfig() {
  // First try DATABASE_URL
  if (process.env.DATABASE_URL) {
    const config = parseConnectionString(process.env.DATABASE_URL);
    if (config) {
      return {
        ...config,
        ssl: {
          rejectUnauthorized: false
        }
      };
    }
  }

  // Then try individual environment variables
  if (process.env.PGUSER && process.env.PGPASSWORD && process.env.PGHOST && process.env.PGDATABASE) {
    return {
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      ssl: {
        rejectUnauthorized: false
      }
    };
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    return {
      user: 'neondb_owner',
      password: 'fpBXEsTct9g1',
      host: 'ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech',
      database: 'neondb',
      ssl: {
        rejectUnauthorized: false
      }
    };
  }

  throw new Error('Database configuration is missing. Please check environment variables.');
}

// Get database configuration with error handling
const dbConfig = getDatabaseConfig();

// Create the pool with validated configuration and improved settings
const pool = new Pool({
  ...dbConfig,
  max: 20,
  min: 4,
  idleTimeoutMillis: 300000, // Increased to 5 minutes
  connectionTimeoutMillis: 30000, // Increased to 30 seconds
  statement_timeout: 300000, // Increased to 5 minutes
  query_timeout: 300000, // Increased to 5 minutes
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000
});

// Monitor pool errors
pool.on('error', (err: Error & { code?: string }) => {
  logger.error('Unexpected error on idle client', err);
  // Don't exit process, just log the error
  logger.error('Database pool error:', {
    error: err.message,
    code: err.code,
    stack: err.stack
  });
});

// Export a wrapper function to handle connection errors with improved retry logic
async function query(text: string, params?: any[]) {
  let client;
  let retries = 5;
  let lastError;
  let delay = 1000; // Start with 1 second delay
  
  while (retries > 0) {
    try {
      client = await pool.connect();
      
      // Add keepalive query with timeout
      await Promise.race([
        client.query('SELECT 1'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Keepalive timeout')), 5000)
        )
      ]);
      
      const result = await client.query(text, params);
      return result;
    } catch (error: any) {
      lastError = error;
      retries--;
      
      // Log detailed error information
      logger.error('Database query error:', {
        error: {
          code: error.code,
          message: error.message,
          stack: error.stack
        },
        retriesLeft: retries,
        query: text,
        delay
      });

      // Handle different types of errors
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === '57P01') {
        // Connection timeout, refused, or terminated
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
          // Exponential backoff with max delay of 10 seconds
          delay = Math.min(delay * 2, 10000);
          continue;
        }
      } else if (error.code === '40P01') {
        // Deadlock detected (40P01), retry immediately
        if (retries > 0) {
          continue;
        }
      } else if (error.code === '57014') {
        // Query cancelled or timed out
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 1.5, 10000);
          continue;
        }
      } else {
        // For other errors, throw immediately if they're not retryable
        if (!isRetryableError(error)) {
          throw error;
        }
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 2, 10000);
          continue;
        }
      }
    } finally {
      if (client) {
        client.release(true);
      }
    }
  }
  
  // If we've exhausted all retries, throw the last error
  throw lastError || new Error('Max retries reached for database connection');
}

// Helper function to determine if an error is retryable
function isRetryableError(error: any): boolean {
  const retryableCodes = [
    'ETIMEDOUT',
    'ECONNREFUSED',
    '57P01', // Database connection terminated
    '40P01', // Deadlock
    '57014', // Query cancelled
    'XX000', // Internal error
    '08006', // Connection failure
    '08001', // Unable to connect
    '08004'  // Rejected connection
  ];
  
  return retryableCodes.includes(error.code) ||
         error.message.includes('timeout') ||
         error.message.includes('connection') ||
         error.message.includes('deadlock');
}

// Create a new Kysely instance with the PostgreSQL dialect
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool,
  }),
});

// Export a function to get the database instance
export function getDb() {
  return db;
}

// Add a health check function
export async function checkDatabaseConnection() {
  try {
    const result = await query('SELECT 1');
    return result.rowCount === 1;
  } catch (error) {
    logger.error('Database health check failed:', error);
    return false;
  }
}

export default pool;
export { query }; 