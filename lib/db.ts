import { Pool, QueryResult, QueryResultRow } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from './schema';
import logger from './logger';
import { isServerless } from './utils';

// Parse and validate the connection string
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Determine environment-specific settings
const isServerlessEnv = isServerless();
const poolConfig = {
  connectionString,
  ssl: process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false }
    : undefined,
  // Serverless-optimized settings
  max: isServerlessEnv ? 1 : 10, // Use single connection in serverless
  min: isServerlessEnv ? 0 : 2,  // No minimum in serverless
  idleTimeoutMillis: isServerlessEnv ? 10000 : 60000, // Shorter timeout in serverless
  connectionTimeoutMillis: 10000, // 10 seconds connection timeout
  maxUses: isServerlessEnv ? 1 : 7500, // Single use per connection in serverless
  allowExitOnIdle: true,
  keepAlive: !isServerlessEnv, // Disable keepalive in serverless
  keepAliveInitialDelayMillis: 10000
};

// Create connection pool with retry mechanism
let pool: Pool | null = null;
let isConnected = false;

function createPool() {
  if (!pool) {
    pool = new Pool(poolConfig);
    
    // Connection management
    pool.on('connect', (client) => {
      isConnected = true;
      logger.info('New database connection established', {
        serverless: isServerlessEnv,
        poolSize: pool?.totalCount,
        idle: pool?.idleCount
      });

      // Set session parameters for non-serverless environments
      if (!isServerlessEnv) {
        client.query('SET statement_timeout = 30000'); // 30 seconds
        client.query('SET idle_in_transaction_session_timeout = 60000'); // 1 minute
      }
    });

    pool.on('error', (err, client) => {
      isConnected = false;
      logger.error('Unexpected database error:', {
        error: err.message,
        stack: err.stack,
        serverless: isServerlessEnv
      });
      
      // Remove errored client
      if (client) {
        client.release(true);
      }

      // In serverless, create a new pool on next query
      if (isServerlessEnv) {
        pool = null;
      }
    });

    pool.on('remove', () => {
      logger.info('Database connection removed from pool');
      if (isServerlessEnv) {
        pool = null;
        isConnected = false;
      }
    });
  }
  return pool;
}

// Verify connection with retries
async function verifyConnection(retries = 3, delay = 2000): Promise<void> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query('SELECT NOW()');
        logger.info('Database connection verified:', {
          timestamp: result.rows[0].now,
          attempt,
          serverless: isServerlessEnv
        });
        return;
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      logger.error(`Database connection attempt ${attempt} failed:`, {
        error: lastError.message,
        attempt,
        serverless: isServerlessEnv
      });
      
      if (attempt === retries) {
        throw lastError;
      }
      
      // Recreate pool on retry in serverless
      if (isServerlessEnv) {
        pool = null;
      }
      
      await new Promise(resolve => setTimeout(resolve, delay * attempt)); // Exponential backoff
    }
  }
}

// Get or create pool
function getPool(): Pool {
  if (!pool || !isConnected) {
    pool = createPool();
  }
  return pool;
}

// Initialize connection verification
if (!isServerlessEnv) {
  // Only verify connection at startup in non-serverless environments
  (async () => {
    try {
      await verifyConnection();
    } catch (error) {
      logger.error('Failed to verify initial database connection:', error);
      // Don't exit process, let the application handle reconnection
    }
  })();
}

// Execute query with retries
export async function query<T extends QueryResultRow = any>(
  text: string,
  params: any[] = [],
  retries = 2
): Promise<QueryResult<T>> {
  const start = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const client = await getPool().connect();
      try {
        const result = await client.query<T>(text, params);
        const duration = Date.now() - start;
        
        if (duration > 1000) {
          logger.warn('Slow query detected:', {
            text,
            duration,
            rows: result.rowCount
          });
        }

        logger.debug('Query executed:', {
          text,
          duration,
          rows: result.rowCount,
          attempt
        });

        return result;
      } finally {
        client.release();
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      const duration = Date.now() - start;

      logger.error(`Query attempt ${attempt} failed:`, {
        error: lastError.message,
        query: text,
        params,
        duration,
        serverless: isServerlessEnv
      });

      // In serverless, recreate pool on next attempt
      if (isServerlessEnv) {
        pool = null;
        isConnected = false;
      }

      if (attempt <= retries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error('Query failed for unknown reason');
}

// Create and export Kysely instance with custom error handling
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool: getPool()
  })
});

// Export pool for direct access if needed
export { pool }; 