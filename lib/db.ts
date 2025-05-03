import { Kysely, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import logger from './logger';

// Constants
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second
const CONNECTION_TIMEOUT = 60000; // 60 seconds

// Get the appropriate connection string
const CONNECTION_STRING = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!CONNECTION_STRING) {
  throw new Error('No database connection string provided');
}

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

// Database Connection Setup
const pool = new Pool({
  connectionString: CONNECTION_STRING,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : undefined
});

// Create Kysely instance
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool
  })
});

// Initialize database
export async function initializeDatabase(): Promise<void> {
  try {
    await pool.query('SELECT 1');
    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize database:', error);
    throw error;
  }
}

// Query Functions
export async function query(text: string, params?: any[]) {
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
    logger.error('Database query error:', error);
    throw error;
  }
}

export async function getMaintenanceMode(): Promise<boolean> {
  try {
    const result = await query(`
      SELECT value FROM settings 
      WHERE key = 'maintenance_mode' 
      LIMIT 1
    `);
    return result.rows[0]?.value === 'true';
  } catch (error) {
    logger.error('Error getting maintenance mode:', error);
    return false;
  }
}

export async function createBookingWithTransaction(bookingData: Partial<Database['bookings']>) {
  return await db.transaction().execute(async (trx) => {
    const booking = await trx
      .insertInto('bookings')
      .values(bookingData as any)
      .returning('id')
      .executeTakeFirst();
      
    return booking;
  });
}

export async function getUsersDirectly(): Promise<UserRow[]> {
  try {
    const result = await query(`
      SELECT 
        id::text, 
        name, 
        email, 
        phone, 
        role,
        created_at,
        updated_at,
        CASE WHEN is_blocked IS TRUE THEN TRUE ELSE FALSE END as is_blocked
      FROM users
      ORDER BY created_at DESC
    `);

    return result.rows;
  } catch (error) {
    logger.error('Error in direct database query for users:', error);
    return [];
  }
}

// Cleanup Functions
export async function closePool(): Promise<void> {
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

// Handle cleanup on process exit
process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

export default db;