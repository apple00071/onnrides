const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // List of migrations to run in order
    const migrations = [
      '024_add_is_available_column.sql',
      '025_add_price_per_hour_column.sql',
      '026_add_min_booking_hours_column.sql',
      '027_fix_price_column_type.sql',
      '028_fix_min_hours_column_type.sql'
    ];
    
    for (const migrationFile of migrations) {
      console.log(`Running migration: ${migrationFile}`);
      
      // Read the migration file
      const migrationPath = path.join(__dirname, '..', 'migrations', migrationFile);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      
      // Execute the migration
      await client.query(migrationSql);
      
      console.log(`Completed migration: ${migrationFile}`);
    }
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('All migrations completed successfully!');
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    // Release the client back to the pool
    client.release();
    // Close the pool
    await pool.end();
  }
}

runMigrations(); 