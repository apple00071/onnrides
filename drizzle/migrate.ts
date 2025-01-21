import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';

// Create SQLite database connection
const sqlite = new Database('sqlite.db');
const db = drizzle(sqlite);

// Run migrations
console.log('Running migrations...');
migrate(db, { migrationsFolder: './drizzle/migrations' });
console.log('Migrations completed!'); 