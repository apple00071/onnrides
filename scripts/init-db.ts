import { neon } from '@neondatabase/serverless';
import logger from '@/lib/logger';

async function main() {
  try {
    logger.info('Starting database initialization...');
    
    const sql = neon(process.env.DATABASE_URL!);

    // Create enums
    await sql`
      DO $$ BEGIN
        CREATE TYPE user_status AS ENUM ('active', 'blocked', 'deleted');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'retired');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      DO $$ BEGIN
        CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // Create extensions
    await sql`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;

    logger.info('Database initialization completed successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  }
}

main().catch(console.error); 