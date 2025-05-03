const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Create a connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    // Start a transaction
    await client.query('BEGIN');
    
    // Read the migration file
    const migrationFile = path.join(__dirname, '..', 'migrations', '024_add_is_available_column.sql');
    const migrationSql = fs.readFileSync(migrationFile, 'utf8');
    
    // Execute the migration
    await client.query(migrationSql);
    
    // Commit the transaction
    await client.query('COMMIT');
    
    console.log('Migration completed successfully!');
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

runMigration(); 