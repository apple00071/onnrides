const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

// Create a new pool using the connection string
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL_NON_POOLING,
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixSchema() {
  const client = await pool.connect();
  try {
    console.log('Fixing database schema...\n');

    // Start transaction
    await client.query('BEGIN');

    // Fix users table
    console.log('Fixing users table...');
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS email VARCHAR(255) UNIQUE NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255) NOT NULL DEFAULT '';
    `);

    // Fix vehicles table
    console.log('Fixing vehicles table...');
    await client.query(`
      ALTER TABLE vehicles
      ADD COLUMN IF NOT EXISTS brand VARCHAR(100) NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
    `);

    // Fix profiles table
    console.log('Fixing profiles table...');
    await client.query(`
      ALTER TABLE profiles
      RENAME COLUMN phone TO phone_number;
    `);

    // Fix bookings table
    console.log('Fixing bookings table...');
    await client.query(`
      ALTER TABLE bookings
      DROP COLUMN IF EXISTS amount;
    `);

    // Commit transaction
    await client.query('COMMIT');
    console.log('\n✅ Database schema fixed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fixing schema:', error);
    throw error;
  } finally {
    client.release();
  }
}

fixSchema()
  .catch((err) => {
    console.error('Failed to fix schema:', err);
    process.exit(1);
  }); 