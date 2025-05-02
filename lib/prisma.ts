import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from './logger';
import { Pool } from 'pg';

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

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'minimal',
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  }).$extends(withAccelerate());
}

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
export const prisma = globalThis.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}

export default prisma;

// Force reset of global instance to fix UUID type issues
if (globalThis.prisma) {
  try {
    logger.info('Disconnecting existing Prisma client...');
    globalThis.prisma.$disconnect();
    globalThis.prisma = undefined;
    logger.info('Existing Prisma client disconnected');
  } catch (error) {
    logger.warn('Failed to disconnect existing client, continuing with new instance');
  }
}

// Add connection management with retry logic
let isConnected = false;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000; // 1 second

export async function connectPrisma(retryCount = 0): Promise<typeof prisma> {
  try {
    if (!isConnected) {
      await prisma.$connect();
      isConnected = true;
      logger.info('Successfully connected to database');
    }
    return prisma;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      logger.warn(`Connection attempt ${retryCount + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return connectPrisma(retryCount + 1);
    }
    logger.error('Failed to connect to database after retries:', error);
    throw error;
  }
}

// Export a safe disconnect function with retry logic
export async function disconnectPrisma(retryCount = 0): Promise<void> {
  try {
    if (isConnected) {
      await prisma.$disconnect();
      isConnected = false;
      logger.info('Prisma client disconnected successfully');
    }
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
      logger.warn(`Disconnect attempt ${retryCount + 1} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return disconnectPrisma(retryCount + 1);
    }
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error disconnecting Prisma client:', { error: errorMessage });
    throw error;
  }
}

// Function to directly query users from the database
async function getUsersDirectly() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 4, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 60000, // Return an error after 60 seconds if connection could not be established
  });

  try {
    // Direct SQL query to get users, converting any numeric IDs to strings
    const result = await pool.query<UserRow>(`
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

    return result.rows.map((row: UserRow) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_blocked: row.is_blocked
    }));
  } catch (error) {
    logger.error('Error in direct database query for users:', error);
    return [];
  } finally {
    await pool.end();
  }
}

// Function to get a user by ID directly from the database
async function getUserByIdDirectly(id: string) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Try to find the user by ID, handling both UUID and numeric IDs
    const result = await pool.query<UserRow>(`
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
      WHERE id::text = $1
    `, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      created_at: row.created_at,
      updated_at: row.updated_at,
      is_blocked: row.is_blocked
    };
  } catch (error) {
    logger.error(`Error finding user by ID ${id}:`, error);
    return null;
  } finally {
    await pool.end();
  }
} 