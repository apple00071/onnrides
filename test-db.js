require('dotenv').config(); const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:fpBXEsTct9g1@ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to the database!');
    const result = await client.query('SELECT NOW()');
    console.log('Current database time:', result.rows[0].now);
    client.release();
  } catch (err) {
    console.error('Error connecting to the database:', err.message);
  } finally {
    await pool.end();
  }
}

testConnection();
