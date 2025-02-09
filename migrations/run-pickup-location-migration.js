require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Create a new pool using the connection string from environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function runMigration() {
  try {
    console.log('Starting pickup_location migration...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, 'add_pickup_location_to_bookings.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Run the migration
    await pool.query(sql);

    console.log('Successfully added pickup_location to bookings table');
  } catch (error) {
    console.error('Error running pickup_location migration:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  }); 