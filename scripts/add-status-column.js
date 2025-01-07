const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function addStatusColumn() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Add status column with default value 'active'
    await client.query(`
      ALTER TABLE vehicles
      ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active'
      CHECK (status IN ('active', 'maintenance', 'unavailable'));
    `);

    await client.query('COMMIT');
    console.log('Successfully added status column to vehicles table');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding status column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addStatusColumn().catch(console.error); 