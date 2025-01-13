import { drizzle } from 'drizzle-orm/vercel-postgres';
import { migrate } from 'drizzle-orm/vercel-postgres/migrator';
import { sql } from '@vercel/postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const runMigrations = async () => {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL is not defined');
  }

  const db = drizzle(sql);

  try {
    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: 'app/lib/lib/migrations' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  }

  process.exit(0);
};

runMigrations(); 