// Load environment variables
require('dotenv').config();

const { Pool } = require('pg');

// Create a connection pool using environment variables
const pool = new Pool({
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  password: process.env.PGPASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 10000,
});

async function checkTables() {
  const client = await pool.connect();
  
  try {
    console.log('Checking database tables...');
    
    // Check bookings count
    const bookingsResult = await client.query('SELECT COUNT(*) FROM bookings');
    console.log(`Bookings count: ${bookingsResult.rows[0].count}`);
    
    // Check vehicles count
    const vehiclesResult = await client.query('SELECT COUNT(*) FROM vehicles');
    console.log(`Vehicles count: ${vehiclesResult.rows[0].count}`);
    
    // Check users count
    const usersResult = await client.query('SELECT COUNT(*) FROM users');
    console.log(`Users count: ${usersResult.rows[0].count}`);
    
    // If we have bookings, get a sample
    if (parseInt(bookingsResult.rows[0].count) > 0) {
      const sampleBookings = await client.query('SELECT id, booking_id, status, created_at FROM bookings LIMIT 3');
      console.log('Sample bookings:', JSON.stringify(sampleBookings.rows, null, 2));
    }
    
    // If we have vehicles, get a sample
    if (parseInt(vehiclesResult.rows[0].count) > 0) {
      const sampleVehicles = await client.query('SELECT id, name, type, status FROM vehicles LIMIT 3');
      console.log('Sample vehicles:', JSON.stringify(sampleVehicles.rows, null, 2));
    }
    
    // Check for database columns
    console.log('\nChecking database schema:');
    const tables = await client.query(`
      SELECT tablename 
      FROM pg_catalog.pg_tables 
      WHERE schemaname = 'public'
    `);
    
    console.log(`Tables found: ${tables.rows.length}`);
    console.log('Table names:', tables.rows.map(t => t.tablename).join(', '));
    
  } catch (error) {
    console.error('Error checking database:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTables()
  .catch(err => {
    console.error('Failed to check database:', err);
    process.exit(1);
  }); 