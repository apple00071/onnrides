const { Pool } = require('pg');
const fs = require('fs').promises;
const path = require('path');

// Database configuration from .env
const config = {
  connectionString: "postgres://neondb_owner:fpBXEsTct9g1@ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require"
};

async function runMigration() {
  const pool = new Pool(config);
  
  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', 'add_payment_id_to_bookings.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    // Run the migration
    console.log('Running migration...');
    await pool.query(migrationSQL);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration(); 