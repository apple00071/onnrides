import { withAccelerate } from '@prisma/extension-accelerate';
import logger from './logger';
import { PrismaClient } from '@prisma/client';

// Force a new instance with clean import
import { Pool } from 'pg';

export { PrismaClient };

declare global {
  var prisma: PrismaClient | undefined
}

const prisma = global.prisma || new PrismaClient({
  log: ['query', 'error', 'warn']
})

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma
}

// Force reset of global instance to fix UUID type issues
if (global.prisma) {
  try {
    logger.info('Disconnecting existing Prisma client...');
    global.prisma.$disconnect();
    global.prisma = undefined;
    logger.info('Existing Prisma client disconnected');
  } catch (error) {
    logger.warn('Failed to disconnect existing client, continuing with new instance');
  }
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500; // 500ms initial delay

// Function to directly query users from the database
async function getUsersDirectly() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Direct SQL query to get users, converting any numeric IDs to strings
    const result = await pool.query(`
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

    return result.rows.map(row => ({
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
    const result = await pool.query(`
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

// Export a safe disconnect function
export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Prisma client disconnected successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error disconnecting Prisma client:', { error: errorMessage });
    throw error;
  }
}

// Export the client with accelerate extension
export default prisma.$extends(withAccelerate()); 