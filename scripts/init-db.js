const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');

// Create a new pool using the connection string from environment variables
const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'onnrides',
  user: process.env.POSTGRES_USER || 'postgres',
  password: 'Sulochana8%'  // Using the password from .env
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    // Drop existing tables
    await client.query(`
      DROP TABLE IF EXISTS document_submissions CASCADE;
      DROP TABLE IF EXISTS bookings CASCADE;
      DROP TABLE IF EXISTS vehicles CASCADE;
      DROP TABLE IF EXISTS profiles CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);

    // Read and execute the SQL file
    const sqlPath = path.join(__dirname, 'init-db.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    await client.query(sqlContent);
    console.log('Database initialized successfully');

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await client.query(`
      INSERT INTO users (email, password_hash, role)
      VALUES ($1, $2, $3)
      ON CONFLICT (email) DO NOTHING
      RETURNING id
    `, ['admin@onnrides.com', hashedPassword, 'admin']);

    // Create admin profile
    await client.query(`
      INSERT INTO profiles (user_id)
      SELECT id FROM users WHERE email = 'admin@onnrides.com'
      ON CONFLICT (user_id) DO NOTHING
    `);

    console.log('Admin user created successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

initializeDatabase(); 