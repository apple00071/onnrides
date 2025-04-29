import { Pool, QueryResult } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from './schema';
import logger from './logger';
import { PrismaClient, Prisma } from '@prisma/client';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const CONNECTION_TIMEOUT = 60000; // 60 seconds

// Prisma client configuration
const prismaClientConfig: Prisma.PrismaClientOptions = {
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ],
  errorFormat: 'minimal' as const,
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  },
  // Add connection pooling configuration
  __internal: {
    engine: {
      cwd: process.cwd(),
      binaryPath: process.env.PRISMA_QUERY_ENGINE_BINARY,
      datamodelPath: './prisma/schema.prisma',
      enableDebugLogs: true,
    },
  }
};

async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

class PrismaClientManager {
  private static instance: PrismaClient | undefined;
  private static isConnecting: boolean = false;
  private static connectionPromise: Promise<void> | null = null;
  private static lastReconnectAttempt: number = 0;
  private static reconnectCooldown: number = 5000; // 5 seconds cooldown between reconnects
  private static queryTimeoutIds: Set<NodeJS.Timeout> = new Set();

  static async getInstance(): Promise<PrismaClient> {
    if (!this.instance) {
      this.instance = new PrismaClient(prismaClientConfig);

      // Add event listeners for the Prisma Client
      this.instance.$on('query', (e: any) => {
        logger.debug('Prisma Query:', {
          query: e.query,
          params: e.params,
          duration: e.duration,
          timestamp: new Date().toISOString()
        });
      });

      this.instance.$on('error', (e: any) => {
        logger.error('Prisma Error:', {
          message: e.message,
          target: e.target,
          timestamp: new Date().toISOString()
        });
      });

      await this.connect();
    }
    return this.instance;
  }

  private static async connect(): Promise<void> {
    if (this.isConnecting) {
      return this.connectionPromise!;
    }

    const now = Date.now();
    if (now - this.lastReconnectAttempt < this.reconnectCooldown) {
      await wait(this.reconnectCooldown - (now - this.lastReconnectAttempt));
    }

    this.isConnecting = true;
    this.lastReconnectAttempt = now;

    this.connectionPromise = (async () => {
      try {
        await this.instance!.$connect();
        
        // Test the connection with a simple query
        await this.instance!.$queryRaw`SELECT 1`;
        
        logger.info('Successfully connected to database');
      } catch (error) {
        logger.error('Failed to connect to database:', error);
        this.instance = undefined;
        throw error;
      } finally {
        this.isConnecting = false;
        this.connectionPromise = null;
      }
    })();

    return this.connectionPromise;
  }

  static async disconnect(): Promise<void> {
    // Clear any pending query timeouts
    for (const timeoutId of this.queryTimeoutIds) {
      clearTimeout(timeoutId);
    }
    this.queryTimeoutIds.clear();

    if (this.instance) {
      try {
        await this.instance.$disconnect();
      } catch (error) {
        logger.error('Error during disconnect:', error);
      } finally {
        this.instance = undefined;
      }
    }
  }

  static async retry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;
    let delay = RETRY_DELAY;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Ensure we have a valid connection before attempting the operation
        const client = await this.getInstance();

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          const timeoutId = setTimeout(() => {
            this.queryTimeoutIds.delete(timeoutId);
            reject(new Error('Query timeout'));
          }, CONNECTION_TIMEOUT);
          this.queryTimeoutIds.add(timeoutId);
        });

        // Execute the operation with timeout
        const result = await Promise.race([
          operation(),
          timeoutPromise
        ]) as T;

        // Clear the timeout if the operation succeeds
        for (const timeoutId of this.queryTimeoutIds) {
          clearTimeout(timeoutId);
        }
        this.queryTimeoutIds.clear();

        return result;
      } catch (error: any) {
        lastError = error;
        logger.error(`Attempt ${attempt} failed:`, {
          error: error.message,
          code: error.code,
          name: error.name,
          attempt,
          maxRetries: MAX_RETRIES
        });

        const shouldRetry = 
          error.code === 'P1001' || 
          error.code === 'P1002' ||
          error.message.includes('insufficient data') ||
          error.message.includes('Query timeout') ||
          error.message.includes('Connection lost');

        if (shouldRetry && attempt < MAX_RETRIES) {
          await this.disconnect();
          
          // Exponential backoff with jitter
          delay = Math.min(delay * 2, 10000) * (0.75 + Math.random() * 0.5);
          await wait(delay);
          
          this.instance = new PrismaClient(prismaClientConfig);
          continue;
        }
        
        throw error;
      }
    }
    throw lastError;
  }
}

// Initialize Prisma client with connection handling
export const prisma = new Proxy({} as PrismaClient, {
  get: (target, prop) => {
    return async (...args: any[]) => {
      const client = await PrismaClientManager.getInstance();
      const operation = () => (client as any)[prop](...args);
      return PrismaClientManager.retry(operation);
    };
  }
});

// Export the prisma instance as db for backward compatibility
export const db = prisma;

// Ensure clean shutdown
process.on('beforeExit', async () => {
  await PrismaClientManager.disconnect();
});

// Handle unexpected errors
process.on('unhandledRejection', async (error: Error) => {
  logger.error('Unhandled rejection:', error);
  if (error.message.includes('insufficient data') || error.message.includes('Connection lost')) {
    logger.warn('Attempting to reconnect due to unhandled database error...');
    await PrismaClientManager.disconnect();
    await wait(RETRY_DELAY);
    await PrismaClientManager.getInstance();
  }
});

// Export everything needed
export {
  pool,
  initializeDatabase,
  query,
  closePool,
  dbKysely
};

export interface Vehicle {
  id: string;
  name: string;
  description: string;
  category: string;
  isAvailable: boolean;
  location: string;
  price: number;
  image: string;
  popularityScore: number;
  updatedAt: Date;
}

// Parse and validate the connection string
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a connection pool
const pool = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  },
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
    // Skip creating users table - we're using Prisma migrations instead
    // await query(`
    //   CREATE TABLE IF NOT EXISTS users (
    //     id SERIAL PRIMARY KEY,
    //     email VARCHAR(255) UNIQUE NOT NULL,
    //     password_hash VARCHAR(255) NOT NULL,
    //     name VARCHAR(255) NOT NULL,
    //     role VARCHAR(50) NOT NULL DEFAULT 'user',
    //     is_blocked BOOLEAN DEFAULT false,
    //     last_login TIMESTAMP,
    //     created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    //     updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    //   )
    // `);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

// Create Kysely instance
const dbKysely = new Kysely<Database>({
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
    // Add debug logging for schema context
    if (text.trim().toUpperCase().startsWith('INSERT INTO')) {
      // Log detailed information about the query
      console.log(`DEBUG - Query execution - ${new Date().toISOString()}`);
      console.log(`Query: ${text}`);
      console.log(`Parameters:`, params);
      
      // Check schema context
      try {
        const schemaContext = await pool.query(`
          SELECT current_schema() as schema, 
                 current_database() as database,
                 current_schemas(true) as search_path
        `);
        console.log(`Schema context:`, schemaContext.rows[0]);
        
        // Check column type specifically
        if (text.includes('users') && params && params[0]) {
          const typeCheck = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND column_name = 'id'
          `);
          console.log(`Users.id column type:`, typeCheck.rows[0]);
        }
      } catch (contextError) {
        console.error('Error getting schema context:', contextError);
      }
    }
    
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