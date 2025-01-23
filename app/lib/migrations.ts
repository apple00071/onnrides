import { migrate as drizzleMigrate } from 'drizzle-orm/better-sqlite3/migrator';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { users, vehicles, bookings, documents } from './schema';

// Initialize SQLite database
const sqlite = new Database('local.db');
const db = drizzle(sqlite);

// Run migrations
export async function migrate() {
  console.log('Running migrations...');
  
  try {
    await drizzleMigrate(db, {
      migrationsFolder: './migrations',
    });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Remove the immediate invocation
// main(); 