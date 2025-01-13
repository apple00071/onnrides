import { Pool } from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function clearUsers() {
  const pool = new Pool({
    user: process.env.PGUSER,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
    password: process.env.PGPASSWORD,
    ssl: true
  });

  try {
    // Delete all related records first
    await pool.query('TRUNCATE TABLE documents CASCADE;');
    await pool.query('TRUNCATE TABLE bookings CASCADE;');
    // Then delete users
    await pool.query('TRUNCATE TABLE users CASCADE;');
    
    console.log('Successfully cleared all users and related data from the database');
  } catch (error) {
    console.error('Error clearing users:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

clearUsers(); 