import { withAccelerate } from '@prisma/extension-accelerate';
import logger from './logger';

// Force a new instance with clean import
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// Clear any global Prisma instance for a fresh start
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Force reset of global instance to fix UUID type issues
if (globalForPrisma.prisma) {
  try {
    logger.info('Disconnecting existing Prisma client...');
    globalForPrisma.prisma.$disconnect();
    globalForPrisma.prisma = undefined;
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

const prismaClientSingleton = () => {
  logger.info('Creating new PrismaClient instance...');
  
  // Create a fresh instance
  const client = new PrismaClient({
    log: [
      { level: 'error', emit: 'stdout' },
      { level: 'query', emit: 'stdout' }
    ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      },
    }
  });

  // Apply middleware for retry logic
  client.$use(async (params: any, next: any) => {
    let attempts = 0;
    let delay = RETRY_DELAY_MS;
    
    while (attempts < MAX_RETRIES) {
      try {
        return await next(params);
      } catch (error) {
        attempts++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isConnectionError = 
          errorMessage.includes('Connection') || 
          errorMessage.includes('timeout') || 
          errorMessage.includes('connection') ||
          errorMessage.includes('Closed');
          
        // Only retry for connection-related errors
        if (!isConnectionError || attempts >= MAX_RETRIES) {
          logger.error(`Prisma ${params.model}.${params.action} failed after ${attempts} attempts`, { 
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
            model: params.model, 
            action: params.action,
            args: JSON.stringify(params.args)
          });
          throw error;
        }
        
        logger.warn(`Prisma ${params.model}.${params.action} attempt ${attempts} failed, retrying...`, { 
          error: errorMessage 
        });
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Double the delay for next attempt
      }
    }
  });

  // Extra error handling for P2021 (table not found) errors
  client.$use(async (params: any, next: any) => {
    try {
      return await next(params);
    } catch (error: any) {
      if (error?.code === 'P2021' && params.model === 'settings') {
        logger.error(`Table not found error for ${params.model}. Attempting to create table...`);
        
        try {
          // Try to create the settings table directly using SQL
          await client.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "settings" (
              "id" TEXT PRIMARY KEY,
              "key" TEXT UNIQUE NOT NULL,
              "value" TEXT NOT NULL,
              "created_at" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
              "updated_at" TIMESTAMP(6) NOT NULL DEFAULT NOW()
            )
          `);
          
          logger.info('Created settings table');
          
          // Try the operation again after creating the table
          return await next(params);
        } catch (createError) {
          logger.error('Failed to create settings table', createError);
          throw error; // Throw the original error
        }
      }
      
      // Add special handling for user ID type mismatch errors
      if (error?.code === 'P2032' && params.model === 'users' && 
          error.meta?.field === 'id' && error.meta?.expected_type === 'String') {
        logger.warn('Type mismatch detected for user IDs. Using direct database access as fallback.');
        
        // Use direct database queries instead of returning empty results
        if (params.action === 'findMany') {
          logger.info('Fetching users directly from database due to type mismatch');
          return getUsersDirectly();
        }
        if (params.action === 'findUnique' || params.action === 'findFirst') {
          const userId = params.args?.where?.id;
          if (userId) {
            logger.info(`Fetching user ${userId} directly from database due to type mismatch`);
            return getUserByIdDirectly(userId);
          }
          return null;
        }
      }
      
      throw error;
    }
  });

  // Add middleware for UUID handling
  client.$use(async (params: any, next: any) => {
    // Log UUID-related operations for debugging
    if (params.args && params.args.where && params.args.where.id) {
      const idValue = params.args.where.id;
      if (typeof idValue === 'string' && !idValue.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        logger.warn(`Potential invalid UUID format detected in ${params.model}.${params.action}:`, { id: idValue });
      }
    }
    
    return next(params);
  });

  return client;
};

// Create a new instance
export const prisma = prismaClientSingleton();

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

// Set the global instance
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Export the client with accelerate extension
export default prisma.$extends(withAccelerate()); 