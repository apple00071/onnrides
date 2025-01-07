/* eslint-disable indent */
import pg from 'pg';
const { Pool } = pg;

// Get database configuration from environment variables
const config = {
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'onnrides',
  // Add connection timeout and pool settings
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 20,
  // Disable SSL for development, enable for production with proper configuration
  ssl: process.env.NODE_ENV === 'production' 
    ? {
      rejectUnauthorized: false,
      ca: process.env.POSTGRES_CA_CERT,
    }
    : false
};

// Create pool instance
const pool = new Pool(config);

// Test the connection
pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

// Test database connection on startup
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Database connection test successful');
    client.release();
  } catch (err) {
    console.error('Error connecting to the database:', err);
    throw err;
  }
}

// Run the test
testConnection().catch(err => {
  console.error('Initial database connection failed:', err);
  // Don't exit in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

export default pool; 