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

    // Remove brand column from vehicles table
    console.log('Removing brand column from vehicles table...');
    await client.query(`
      ALTER TABLE vehicles
      DROP COLUMN IF EXISTS brand;
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