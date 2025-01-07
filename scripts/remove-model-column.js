const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function removeBrandColumn() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Remove the model column from vehicles table
    await client.query(`
      ALTER TABLE vehicles
      DROP COLUMN model;
    `);

    await client.query('COMMIT');
    console.log('Successfully removed model column from vehicles table');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error removing model column:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

removeBrandColumn().catch(console.error); 