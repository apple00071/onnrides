import { Kysely, PostgresDialect } from 'kysely';
import { Pool, QueryResult } from 'pg';
import logger from '@/lib/logger';

// Constants for database operations
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000; // 2 seconds
const CONNECTION_TIMEOUT = 10000; // 10 seconds

// Create a pool instance
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: CONNECTION_TIMEOUT,
  max: Number(process.env.PG_POOL_MAX) || 20,
  idleTimeoutMillis: Number(process.env.PG_POOL_IDLE_TIMEOUT) || 30000,
});

// Handle pool errors
pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
});

// Handle pool connect
pool.on('connect', (client) => {
  logger.info('New database connection established');
  client.on('error', (err) => {
    logger.error('Database client error:', err);
  });
});

// Define a type for PostgreSQL database errors
interface DatabaseError extends Error {
  code?: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
}

// Helper function to handle database errors
function handleDatabaseError(error: DatabaseError, operation: string) {
  const errorDetails = {
    code: error.code,
    detail: error.detail,
    hint: error.hint,
    position: error.position,
    internalPosition: error.internalPosition,
    internalQuery: error.internalQuery,
    where: error.where,
    schema: error.schema,
    table: error.table,
    column: error.column,
    dataType: error.dataType,
    constraint: error.constraint,
    operation
  };

  logger.error('Database error:', errorDetails);

  // Specific error handling based on error codes
  switch (error.code) {
    case '28P01': // Invalid password
      throw new Error('Database authentication failed. Please check credentials.');
    case '3D000': // Database does not exist
      throw new Error('Database does not exist.');
    case '57P03': // Database connection being closed
      throw new Error('Database connection is being closed.');
    case '57P01': // Database shutting down
      throw new Error('Database server is shutting down.');
    case '08006': // Connection failure
      throw new Error('Unable to connect to the database server.');
    case '08001': // Unable to establish connection
      throw new Error('Unable to establish database connection.');
    default:
      throw new Error(`Database ${operation} failed: ${error.message}`);
  }
}

// Query function with retry logic
export async function query(text: string, params: any[] = []): Promise<QueryResult> {
  let retries = MAX_RETRIES;
  let lastError: unknown;

  while (retries > 0) {
    try {
      const start = Date.now();
      const result = await pool.query(text, params);
      const duration = Date.now() - start;

      logger.debug('Executed query', {
        text,
        duration,
        rows: result.rowCount,
        retriesLeft: retries
      });

      return result;
    } catch (error: unknown) {
      lastError = error;
      retries--;

      if (retries > 0) {
        logger.warn('Database query failed, retrying...', {
          error: error instanceof Error ? error.message : 'Unknown error',
          code: (error as DatabaseError).code || 'UNKNOWN',
          retriesLeft: retries
        });
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  handleDatabaseError(lastError as DatabaseError, 'query execution');
  throw lastError; // This line will never be reached due to handleDatabaseError throwing
}

// Initialize database connection
export async function initializeDatabase(): Promise<boolean> {
  try {
    logger.info('Initializing database connection', {
      environment: process.env.NODE_ENV,
      host: process.env.PGHOST || new URL(process.env.DATABASE_URL || '').hostname,
      ssl: true
    });

    // Test the connection
    const result = await query('SELECT NOW()');
    if (result.rows.length > 0) {
      logger.info('Database connection successful', {
        timestamp: result.rows[0].now
      });
      return true;
    }
    return false;
  } catch (error) {
    logger.error('Failed to initialize database:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any).code,
      detail: (error as any).detail
    });
    return false;
  }
}

// Close database pool
export async function closePool(): Promise<void> {
  try {
    await pool.end();
    logger.info('Database pool closed successfully');
  } catch (error) {
    logger.error('Error closing database pool:', error);
  }
}

// Export pool for direct access if needed
export { pool };

// Type Definitions
interface Database {
  users: {
    id: string;
    name: string | null;
    email: string | null;
    password_hash: string | null;
    phone: string | null;
    reset_token: string | null;
    reset_token_expiry: Date | null;
    is_blocked: boolean | null;
    role: string | null;
    created_at: Date | null;
    updated_at: Date | null;
  };
  settings: {
    id: string;
    key: string;
    value: string;
    created_at: Date;
    updated_at: Date;
  };
  bookings: {
    id: string;
    user_id: string;
    vehicle_id: string;
    start_date: Date;
    end_date: Date;
    total_hours: number;
    total_price: number;
    status: string | null;
    payment_status: string | null;
    payment_details: string | null;
    created_at: Date | null;
    updated_at: Date | null;
    pickup_location: string | null;
    dropoff_location: string | null;
    booking_id: string | null;
    payment_intent_id: string | null;
  };
  vehicles: {
  id: string;
  name: string;
    type: string;
  location: string;
    quantity: number;
    price_per_hour: number;
    min_booking_hours: number;
    is_available: boolean | null;
    images: string;
    status: string | null;
    created_at: Date | null;
    updated_at: Date | null;
  };
}

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: Date;
  updated_at: Date;
  is_blocked: boolean;
}

// Create Kysely instance
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool
  })
});

// Initialize database on module load
initializeDatabase().catch(error => {
  logger.error('Database initialization failed:', error);
  process.exit(1);
});

// Handle cleanup on process exit
process.on('exit', () => {
  closePool().catch(error => {
    logger.error('Error during cleanup:', error);
  });
});

export default db;