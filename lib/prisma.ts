import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '@/lib/logger';

declare global {
  var cachedPrisma: PrismaClient | undefined;
}

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 1000;

const prismaClientSingleton = () => {
  const client = new PrismaClient({
    log: [
      { level: 'error', emit: 'stdout' },
      { level: 'query', emit: 'stdout' }
    ],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });

  client.$use(async (params: any, next: any) => {
    let attempts = 0;
    let delay = RETRY_DELAY_MS;
    
    while (attempts < MAX_RETRIES) {
      try {
        return await next(params);
      } catch (error: any) {
        attempts++;
        const isConnectionError = 
          error.message?.includes('Connection') || 
          error.message?.includes('timeout') || 
          error.message?.includes('connection') ||
          error.message?.includes('Closed') ||
          error.message?.includes('P2024') ||
          error.message?.includes('fetching a new connection');
          
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
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
  });

  return client;
};

const initializePrisma = async () => {
  try {
    const client = prismaClientSingleton();
    await client.$connect();
    logger.info('Prisma client connected successfully');
    return client;
  } catch (error: any) {
    logger.error('Failed to initialize Prisma client:', { error: error.message });
    throw error;
  }
};

let prisma: PrismaClient;

if (globalThis.cachedPrisma) {
  prisma = globalThis.cachedPrisma;
} else {
  prisma = prismaClientSingleton();
  prisma.$connect()
    .then(() => logger.info('Prisma client connected successfully'))
    .catch(error => logger.error('Failed to connect Prisma client:', { error: error.message }));
}

export async function disconnectPrisma(): Promise<void> {
  try {
    await prisma.$disconnect();
    logger.info('Prisma client disconnected successfully');
  } catch (error: any) {
    logger.error('Error disconnecting Prisma client:', { error: error.message });
    throw error;
  }
}

if (process.env.NODE_ENV !== 'production') {
  globalThis.cachedPrisma = prisma;
}

export default prisma.$extends(withAccelerate()); 