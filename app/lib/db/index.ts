import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../../../lib/db/schema';

// Initialize SQLite database
const sqlite = new Database('local.db');

// Create and export the database instance
export const db = drizzle(sqlite, { schema });

// Export the raw sqlite instance in case it's needed
export const sqliteDb = sqlite; 