import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '@/lib/logger';
import { pool } from '@/lib/db';

const execAsync = promisify(exec);

async function cleanDatabase() {
  try {
    logger.info('Starting database cleanup...');

    // 1. Drop all tables in the correct order (respecting foreign key constraints)
    await pool.query(`
      DO $$ 
      DECLARE
          tables CURSOR FOR
              SELECT tablename FROM pg_tables
              WHERE schemaname = 'public';
          r RECORD;
      BEGIN
          FOR r IN tables LOOP
              EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
          END LOOP;
      END $$;
    `);
    
    logger.info('All tables dropped successfully');

    // 2. Run prisma generate
    try {
      logger.info('Generating Prisma client...');
      await execAsync('npx prisma generate');
      logger.info('Prisma client generated successfully');
    } catch (error) {
      logger.error('Failed to generate Prisma client:', error);
    }

    // 3. Run prisma migrate reset with force flag
    try {
      logger.info('Running Prisma migrations...');
      await execAsync('npx prisma migrate reset --force');
      logger.info('Prisma migrations completed successfully');
    } catch (error) {
      logger.error('Failed to run Prisma migrations:', error);
    }

    logger.info('Database cleanup completed successfully');
  } catch (error) {
    logger.error('Database cleanup failed:', error);
  } finally {
    // Close the pool connection
    await pool.end();
  }
}

// Run the function
cleanDatabase().catch(error => {
  logger.error('Unhandled error during database cleanup:', error);
  process.exit(1);
}); 