import logger from '@/lib/logger';
import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from './schema';

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
    logger.error('Error parsing connection string:', error);
    return null;
  }
}

function getDatabaseConfig() {
  // Log environment for debugging
  logger.debug('Environment Debug Info:');
  logger.debug('NODE_ENV:', process.env.NODE_ENV);
  logger.debug('VERCEL_ENV:', process.env.VERCEL_ENV);
  logger.debug('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  if (process.env.DATABASE_URL) {
    // Log the database URL structure (without credentials)
    try {
      const url = new URL(process.env.DATABASE_URL);
      logger.debug('Database URL structure:', {
        host: url.hostname,
        port: url.port,
        pathname: url.pathname,
        protocol: url.protocol,
        searchParams: url.searchParams.toString()
      });
    } catch (e) {
      logger.error('Failed to parse DATABASE_URL:', e);
    }
  }

  // First try DATABASE_URL
  if (process.env.DATABASE_URL) {
    logger.debug('Attempting to use DATABASE_URL configuration');
    const config = parseConnectionString(process.env.DATABASE_URL);
    if (config) {
      return {
        ...config,
        ssl: {
          rejectUnauthorized: false
        }
      };
    } else {
      logger.error('Failed to parse DATABASE_URL');
    }
  }

  // Then try individual environment variables
  if (process.env.PGUSER && process.env.PGPASSWORD && process.env.PGHOST && process.env.PGDATABASE) {
    logger.debug('Attempting to use individual PG* environment variables');
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
    logger.warn('Using development database configuration');
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

  throw new Error(
    'Database configuration is missing. Please check environment variables.'
  );
}

// Get database configuration with error handling
let dbConfig;
try {
  dbConfig = getDatabaseConfig();
  logger.debug('Database configuration generated successfully:', {
    host: dbConfig.host,
    database: dbConfig.database,
    user: dbConfig.user,
    ssl: !!dbConfig.ssl
  });
} catch (error) {
  logger.error('Failed to generate database configuration:', error);
  throw error;
}

// Create the pool with validated configuration
const pool = new Pool({
  ...dbConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
  query_timeout: 30000,
});

// Add event listeners for pool error handling
pool.on('error', (err) => {
  logger.error('Pool error:', err);
  if (err instanceof Error && err.message.includes('SSL')) {
    logger.error('SSL-related error detected. Please check SSL configuration.');
  }
});

pool.on('connect', () => {
  logger.debug('New database connection established');
});

pool.on('acquire', () => {
  logger.debug('Database client acquired from pool');
});

pool.on('remove', () => {
  logger.debug('Database client removed from pool');
});

// Test the connection
let isConnected = false;

async function testConnection() {
  let client;
  try {
    logger.debug('Testing database connection...');
    client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    isConnected = true;
    logger.debug('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    logger.error('Database connection test failed:');
    if (error instanceof Error) {
      logger.error('Error name:', error.name);
      logger.error('Error message:', error.message);
      logger.error('Error stack:', error.stack);

      if (error.message.includes('SSL')) {
        logger.error('SSL Error: Please check SSL configuration');
      }
      if (error.message.includes('timeout')) {
        logger.error('Timeout Error: Connection took too long');
      }
      if (error.message.includes('authentication')) {
        logger.error('Authentication Error: Check credentials');
      }
    } else {
      logger.error('Unknown error:', error);
    }
    isConnected = false;
    return false;
  } finally {
    if (client) {
      client.release();
      logger.debug('Test connection client released');
    }
  }
}

// Export a wrapper function to handle connection errors
async function query(text: string, params?: any[]) {
  let client;
  try {
    client = await pool.connect();
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    logger.debug('Query executed successfully:', {
      text,
      duration,
      rowCount: result.rowCount
    });
    return result;
  } catch (error) {
    logger.error('Query execution failed:', {
      text,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Initial connection test
testConnection().then(success => {
  if (!success) {
    logger.error('Initial connection test failed - application may not work correctly');
  }
}).catch(error => {
  logger.error('Failed to run initial connection test:', 
    error instanceof Error ? error.message : 'Unknown error'
  );
});

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

export default pool;
export { isConnected, testConnection, query }; 