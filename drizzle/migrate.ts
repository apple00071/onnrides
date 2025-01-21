import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// For migrations, we need a separate connection
const migrationClient = postgres(connectionString, { max: 1 });

async function main() {
  try {
    const db = drizzle(migrationClient);
    console.log('Running migrations...');
    
    await migrate(db, {
      migrationsFolder: 'drizzle/migrations'
    });
    
    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await migrationClient.end();
  }
}

main(); 