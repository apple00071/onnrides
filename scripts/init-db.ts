import pool from '../lib/db';
import fs from 'fs';
import path from 'path';

async function initializeDatabase() {
  try {
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'init-db.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');

    // Connect to the database
    const client = await pool.connect();
    try {
      // Execute the SQL commands
      await client.query(sqlContent);
      console.log('Database initialized successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

initializeDatabase(); 