import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '@/lib/logger';

declare global {
  var cachedPrisma: PrismaClient | undefined;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500; // 500ms initial delay

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: [
      { level: 'error', emit: 'stdout' },
      { level: 'query', emit: 'stdout' }
    ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      },
    },
  });

  // Apply middleware for retry logic
  client.$use(async (params, next) => {
    let attempts = 0;
    let delay = RETRY_DELAY_MS;
    
    while (attempts < MAX_RETRIES) {
      try {
        return await next(params);
      } catch (error: any) { // Using any for error type to access properties
        attempts++;
        const isConnectionError = 
          error.message?.includes('Connection') || 
          error.message?.includes('timeout') || 
          error.message?.includes('connection') ||
          error.message?.includes('Closed');
          
        // Only retry for connection-related errors
        if (!isConnectionError || attempts >= MAX_RETRIES) {
          logger.error(`Prisma ${params.model}.${params.action} failed after ${attempts} attempts`, { 
            error: error.message,
            stack: error.stack,
            model: params.model, 
            action: params.action,
            args: JSON.stringify(params.args)
          });
          throw error;
        }
        
        logger.warn(`Prisma ${params.model}.${params.action} attempt ${attempts} failed, retrying...`, { 
          error: error.message 
        });
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Double the delay for next attempt
      }
    }
  });

  return client;
};

const prisma = globalThis.cachedPrisma ?? prismaClientSingleton();

// Add disconnect handler for graceful shutdowns
process.on('beforeExit', async () => {
  logger.info('Server shutting down, disconnecting Prisma client');
  await prisma.$disconnect();
});

// Also handle SIGTERM and SIGINT
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, disconnecting Prisma client');
  await prisma.$disconnect();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, disconnecting Prisma client');
  await prisma.$disconnect();
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.cachedPrisma = prisma;
}

export default prisma.$extends(withAccelerate()); 