const { Pool } = require('pg');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

async function runMigration(specificFile?: string) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || "postgres://neondb_owner:fpBXEsTct9g1@ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"
  });

  try {
    // Create migrations table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    let sqlFiles: string[];
    if (specificFile) {
      // Run only the specified file
      const filePath = path.join(__dirname, specificFile);
      if (!fsSync.existsSync(filePath)) {
        throw new Error(`Migration file ${specificFile} not found`);
      }
      sqlFiles = [specificFile];
    } else {
      // Get all SQL files
      const migrationFiles = await fs.readdir(__dirname);
      sqlFiles = migrationFiles.filter(file => file.endsWith('.sql'));
    }

    // Get executed migrations
    const { rows: executedMigrations } = await pool.query(
      'SELECT name FROM migrations'
    );
    const executedMigrationNames = new Set(executedMigrations.map(row => row.name));

    // Execute pending migrations
    for (const file of sqlFiles) {
      if (!executedMigrationNames.has(file)) {
        console.log(`Executing migration: ${file}`);
        const sql = await fs.readFile(path.join(__dirname, file), 'utf-8');
        
        // Start a transaction for each migration
        const client = await pool.connect();
        try {
          await client.query('BEGIN');
          
          // Execute the migration
          await client.query(sql);
          
          // Record the migration
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          
          await client.query('COMMIT');
          console.log(`Migration completed: ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          console.error(`Error in migration ${file}:`, error);
          throw error;
        } finally {
          client.release();
        }
      } else {
        console.log(`Skipping already executed migration: ${file}`);
      }
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get the specific migration file from command line arguments
const specificFile = process.argv[2];
runMigration(specificFile); 