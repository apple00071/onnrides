import pool from '../lib/db';

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('Database connection successful!');
    console.log('Current timestamp from database:', result.rows[0].now);
    client.release();
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await pool.end();
  }
}

testConnection(); 