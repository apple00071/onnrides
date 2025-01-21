import { drizzle } from 'drizzle-orm/vercel-postgres';
import { migrate } from 'drizzle-orm/vercel-postgres/migrator';
import * as dotenv from 'dotenv';
import { sql } from '@vercel/postgres';
import { createId } from '@paralleldrive/cuid2';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

async function main() {
  try {
    console.log('Generating migration...');
    
    const db = drizzle(sql);
    await migrate(db, {
      migrationsFolder: 'drizzle/migrations',
      migrationsTable: 'migrations'
    });
    
    console.log('Migration generated successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration generation failed:', error);
    process.exit(1);
  }
}

main(); 