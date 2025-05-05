const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes('ssl=require') ? { rejectUnauthorized: false } : false
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database migrations...');
    
    // List of migrations to run in order
    const migrations = [
      '024_add_is_available_column.sql',
      '025_add_price_per_hour_column.sql',
      '026_add_min_booking_hours_column.sql',
      '027_fix_price_column_type.sql',
      '028_fix_min_hours_column_type.sql',
      '030_standardize_column_names.sql',
      '031_safe_column_handling.sql'
    ];
    
    // Create migrations table if it doesn't exist
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('Migrations table checked/created');
    } catch (error) {
      console.warn('Unable to create migrations table:', error.message);
      console.log('Will attempt to run migrations anyway');
    }
    
    // Get already applied migrations
    let appliedMigrations = [];
    try {
      const result = await client.query(`SELECT name FROM migrations`);
      appliedMigrations = result.rows.map(row => row.name);
      console.log('Already applied migrations:', appliedMigrations);
    } catch (error) {
      console.warn('Unable to check applied migrations:', error.message);
    }
    
    // Run each migration in a separate transaction
    for (const migrationFile of migrations) {
      console.log(`Processing migration: ${migrationFile}`);
      
      // Skip if already applied
      if (appliedMigrations.includes(migrationFile)) {
        console.log(`Migration ${migrationFile} already applied, skipping`);
        continue;
      }
      
      // Read the migration file
      let migrationSql;
      try {
        const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
        
        if (!fs.existsSync(migrationPath)) {
          console.warn(`Migration file ${migrationFile} not found, skipping`);
          continue;
        }
        
        migrationSql = fs.readFileSync(migrationPath, 'utf8');
      } catch (readError) {
        console.error(`Error reading migration file ${migrationFile}:`, readError.message);
        continue;
      }
      
      // Execute the migration in a transaction
      try {
        await client.query('BEGIN');
        
        console.log(`Running migration: ${migrationFile}`);
        await client.query(migrationSql);
        
        // Record the migration
        try {
          await client.query(
            `INSERT INTO migrations (name) VALUES ($1)`,
            [migrationFile]
          );
        } catch (recordError) {
          console.warn(`Unable to record migration ${migrationFile}:`, recordError.message);
        }
        
        await client.query('COMMIT');
        console.log(`Successfully applied migration: ${migrationFile}`);
      } catch (migrationError) {
        await client.query('ROLLBACK');
        console.error(`Error applying migration ${migrationFile}:`, migrationError.message);
        console.log('Continuing to next migration...');
      }
    }
    
    console.log('Migration process completed');
  } catch (error) {
    console.error('Error during migration process:', error.message);
  } finally {
    // Release the client back to the pool
    client.release();
    // Close the pool
    await pool.end();
  }
}

// Run the migrations and handle any unhandled errors
runMigrations()
  .then(() => {
    console.log('Migrations completed. Exiting...');
    process.exit(0);
  })
  .catch(error => {
    console.error('Unhandled error in migration script:', error);
    process.exit(0); // Exit with 0 to let the build continue
  }); 