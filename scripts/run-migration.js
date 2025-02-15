const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create a connection pool using environment variables
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  try {
    // Read the migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../migrations/whatsapp_logs.sql'),
      'utf8'
    );

    // Connect to the database
    const client = await pool.connect();
    
    try {
      // Start a transaction
      await client.query('BEGIN');

      // Run the migration
      await client.query(migrationSQL);

      // Commit the transaction
      await client.query('COMMIT');
      
      console.log('Migration completed successfully');
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      console.error('Error running migration:', error);
      throw error;
    } finally {
      // Release the client back to the pool
      client.release();
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    // Close the pool
    await pool.end();
  }
}

runMigration(); 