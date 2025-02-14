import { Pool, PoolClient } from 'pg';
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
  max: 10,
  min: 2,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
  query_timeout: 30000,
  allowExitOnIdle: true,
  keepAlive: true,
  keepAliveInitialDelayMillis: 5000,
  application_name: 'onnrides_app'
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
  let client: any = undefined;
  let retries = 3;
  let lastError;
  let delay = 500;
  
  while (retries > 0) {
    try {
      client = await Promise.race([
        pool.connect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 10000)
        )
      ]) as PoolClient;
      
      // Add keepalive query with shorter timeout
      await Promise.race([
        client.query('SELECT 1'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Keepalive timeout')), 3000)
        )
      ]);
      
      const result = await Promise.race([
        client.query(text, params),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Query timeout')), 30000)
        )
      ]);
      
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
        delay,
        timestamp: new Date().toISOString()
      });

      if (client) {
        client.release(true);
        client = undefined;
      }

      // Handle different types of errors
      if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED' || error.code === '57P01') {
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, delay));
          delay = Math.min(delay * 1.5, 5000);
          continue;
        }
      } else if (error.code === '40P01' || error.code === '57014') {
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, Math.min(delay, 1000)));
          continue;
        }
      } else if (!isRetryableError(error)) {
        throw error;
      }
      
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * 1.5, 5000);
        continue;
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