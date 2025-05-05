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
  throw new Error('No database connection string provided');
}

// Database Connection Setup
const pool = new Pool({
  connectionString: CONNECTION_STRING,
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
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

// Execute a query with retries
export async function query(text: string, params: any[] = []): Promise<QueryResult> {
  let retries = 0;
  let lastError: any;

  while (retries < MAX_RETRIES) {
    try {
      const start = Date.now();
      const result = await pool.query(text, params);
      const duration = Date.now() - start;

      logger.debug('Executed query:', {
        text,
        duration,
        rows: result.rowCount
      });

      return result;
    } catch (error: any) {
      lastError = error;
      retries++;

      logger.warn(`Query attempt ${retries} failed:`, {
        error: error.message,
        code: error.code,
        query: text
      });

      if (retries < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  handleDatabaseError(lastError, 'query');
  throw lastError; // This line will never be reached due to handleDatabaseError throwing
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