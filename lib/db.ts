import { Kysely, PostgresDialect } from 'kysely';
import { Pool, QueryResult } from 'pg';
import logger from '@/lib/logger';

// Constants for database operations
export const MAX_RETRIES = 3;
export const RETRY_DELAY = 1000; // 1 second
export const CONNECTION_TIMEOUT = 5000; // 5 seconds

// Get the appropriate connection string
const CONNECTION_STRING = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!CONNECTION_STRING) {
  logger.error('Database connection string is missing');
  throw new Error('No database connection string provided');
}

// Log database configuration (without sensitive info)
logger.info('Initializing database connection', {
  environment: process.env.NODE_ENV,
  host: new URL(CONNECTION_STRING).hostname,
  ssl: process.env.NODE_ENV === 'production'
});

// Database Connection Setup
const pool = new Pool({
  connectionString: CONNECTION_STRING,
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined,
  connectionTimeoutMillis: CONNECTION_TIMEOUT
});

// Handle pool events
pool.on('connect', () => {
  logger.info('New database connection established');
});

pool.on('error', (err) => {
  logger.error('Unexpected database error on idle client', err);
});

pool.on('acquire', () => {
  logger.debug('Database connection acquired from pool');
});

pool.on('remove', () => {
  logger.debug('Database connection removed from pool');
});

// Validate database connection
async function validateConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      logger.info('Database connection validated successfully');
      return true;
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Failed to validate database connection:', error);
    throw error;
  }
}

// Initialize connection validation
validateConnection().catch((error) => {
  logger.error('Initial database connection validation failed:', error);
  if (process.env.NODE_ENV === 'production') {
    // In production, we might want to exit and let the process manager restart
    process.exit(1);
  }
});

// Export pool for use in other modules
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

// Query wrapper with retries and error handling
export async function query(text: string, params: any[] = []): Promise<QueryResult> {
  let retries = MAX_RETRIES;
  let lastError;

  while (retries > 0) {
    try {
      const start = Date.now();
      const result = await pool.query(text, params);
      const duration = Date.now() - start;

      logger.debug('Executed query', {
        text,
        duration,
        rows: result.rowCount
      });

      return result;
    } catch (error) {
      lastError = error;
      logger.error('Database query error:', {
        error,
        query: text,
        params,
        retriesLeft: retries - 1
      });

      retries--;
      if (retries > 0) {
        logger.info(`Retrying query in ${RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  throw lastError;
}

// Create Kysely instance
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool
  })
});

// Helper function to handle database errors
function handleDatabaseError(error: any, operation: string) {
  const errorDetails = {
    code: error.code,
    message: error.message,
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
    constraint: error.constraint
  };

  logger.error(`Database ${operation} error:`, errorDetails);
  
  // Check for common error types and provide specific error messages
  switch (error.code) {
    case '23505': // unique_violation
      throw new Error('Duplicate entry found');
    case '23503': // foreign_key_violation
      throw new Error('Referenced record does not exist');
    case '23502': // not_null_violation
      throw new Error('Required field is missing');
    case '42P01': // undefined_table
      throw new Error('Table does not exist');
    case '42703': // undefined_column
      throw new Error('Column does not exist');
    case '28P01': // invalid_password
      throw new Error('Database authentication failed');
    case '57P03': // cannot_connect_now
      throw new Error('Database is not accepting connections');
    default:
      throw new Error(`Database error: ${error.message}`);
  }
}

// Initialize database connection
export async function initializeDatabase() {
  try {
    const result = await query('SELECT NOW()');
    logger.info('Database connection successful:', {
      timestamp: result.rows[0].now
    });
    return true;
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    return false;
  }
}

// Clean up database connections
export async function closePool() {
  try {
    await pool.end();
    logger.info('Database pool closed successfully');
  } catch (error) {
    logger.error('Error closing database pool:', error);
  }
}

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