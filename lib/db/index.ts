import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Connection for migrations
const migrationClient = postgres(connectionString, { max: 1 });

// Connection for queries
const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, {
  schema: schema,
  logger: process.env.NODE_ENV === 'development',
});

// Run migrations (if needed)
export async function runMigrations() {
  await migrate(drizzle(migrationClient), {
    migrationsFolder: './drizzle',
  });
  await migrationClient.end();
} 