const { Pool } = require('pg');
const { readFile, readdir } = require('fs/promises');
const { join } = require('path');

async function migrate() {
  // Load environment variables from .env.local if it exists
  try {
    const envConfig = await readFile('.env.local', 'utf8');
    envConfig.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  } catch (error) {
    console.log('No .env.local file found, using existing environment variables');
  }

  const pool = new Pool({
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'onnrides',
  });

  try {
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
      const migrationsDir = join(process.cwd(), 'migrations');
      const files = await readdir(migrationsDir);
      const sqlFiles = files
        .filter(f => f.endsWith('.sql'))
        .sort((a, b) => {
          // Extract numbers from filenames for proper ordering
          const numA = parseInt(a.match(/\d+/)?.[0] || '0');
          const numB = parseInt(b.match(/\d+/)?.[0] || '0');
          return numA - numB;
        });

      // Execute each migration file that hasn't been run yet
      for (const file of sqlFiles) {
        const migrationName = file.replace('.sql', '');
        
        // Check if migration has already been executed
        const { rows } = await client.query(
          'SELECT id FROM migrations WHERE name = $1',
          [migrationName]
        );

        if (rows.length === 0) {
          console.log(`Running migration: ${file}`);
          const migrationPath = join(migrationsDir, file);
          const sql = await readFile(migrationPath, 'utf8');

          await client.query('BEGIN');
          try {
            await client.query(sql);
            await client.query(
              'INSERT INTO migrations (name) VALUES ($1)',
              [migrationName]
            );
            await client.query('COMMIT');
            console.log(`Migration ${file} completed successfully`);
          } catch (error) {
            await client.query('ROLLBACK');
            console.error(`Error running migration ${file}:`, error);
            throw error;
          }
        } else {
          console.log(`Skipping migration ${file} (already executed)`);
        }
      }
      
      console.log('All migrations completed successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
migrate(); 