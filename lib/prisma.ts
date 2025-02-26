import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';
import logger from '@/lib/logger';

declare global {
  var cachedPrisma: PrismaClient | undefined;
}

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      },
    },
  });
};

const prisma = globalThis.cachedPrisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.cachedPrisma = prisma;
}

export default prisma.$extends(withAccelerate()); 