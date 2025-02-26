import { PrismaClient } from '@prisma/client';
import { withAccelerate } from '@prisma/extension-accelerate';

declare global {
  var cachedPrisma: ReturnType<typeof prismaClientWithExtensions>;
}

const prismaClientWithExtensions = () => {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Handle connection errors through logging
  client.$use(async (params, next) => {
    try {
      return await next(params);
    } catch (error) {
      console.error('Prisma Client Error:', error);
      throw error;
    }
  });

  // Ensure connection is established
  client.$connect()
    .then(() => console.log('Database connection established'))
    .catch((err) => {
      console.error('Failed to connect to the database:', err);
      process.exit(1);
    });

  return client.$extends(withAccelerate());
};

let prisma: ReturnType<typeof prismaClientWithExtensions>;

if (process.env.NODE_ENV === 'production') {
  prisma = prismaClientWithExtensions();
} else {
  if (!global.cachedPrisma) {
    global.cachedPrisma = prismaClientWithExtensions();
  }
  prisma = global.cachedPrisma;
}

export default prisma; 