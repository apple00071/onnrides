const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function simplifyVehiclesTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Drop existing table and recreate with only essential columns
    await client.query(`
      DROP TABLE IF EXISTS vehicles CASCADE;
      CREATE TABLE vehicles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        location VARCHAR(255) NOT NULL,
        price_per_day DECIMAL(10,2) NOT NULL,
        image_url VARCHAR(255) DEFAULT '/cars/default.jpg',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await client.query('COMMIT');
    console.log('Successfully simplified vehicles table');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error simplifying vehicles table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

simplifyVehiclesTable().catch(console.error); 