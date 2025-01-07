import pg from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

const pool = new pg.Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'onnrides'
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    // Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    const migrationsDir = join(dirname(__dirname), 'migrations');
    const migrationFiles = readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    console.log('Found migration files:', migrationFiles);

    // Get executed migrations
    const { rows: executedMigrations } = await client.query(
      'SELECT name FROM migrations ORDER BY id'
    );
    const executedMigrationNames = executedMigrations.map(row => row.name);

    // Run pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrationNames.includes(file)) {
        console.log(`Running migration: ${file}`);
        const migrationPath = join(migrationsDir, file);
        const migrationSql = readFileSync(migrationPath, 'utf-8');

        await client.query('BEGIN');
        try {
          await client.query(migrationSql);
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          console.log(`Migration completed: ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`Migration failed: ${file}`, error);
          throw error;
        }
      } else {
        console.log(`Skipping already executed migration: ${file}`);
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migrations
runMigrations()
  .then(() => {
    console.log('Migrations completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 