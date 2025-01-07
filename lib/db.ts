import { Pool } from 'pg';

function parseConnectionString(connectionString: string) {
  try {
    const url = new URL(connectionString);
    return {
      user: url.username,
      password: url.password,
      host: url.hostname,
      database: url.pathname.split('/')[1],
      ssl: true,
      port: url.port ? parseInt(url.port) : 5432,
    };
  } catch (error) {
    console.error('Error parsing connection string:', error);
    return null;
  }
}

function getDatabaseConfig() {
  // First try individual environment variables
  if (process.env.PGUSER && process.env.PGPASSWORD && process.env.PGHOST && process.env.PGDATABASE) {
    return {
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      ssl: true,
    };
  }

  // Then try DATABASE_URL
  if (process.env.DATABASE_URL) {
    const config = parseConnectionString(process.env.DATABASE_URL);
    if (config) {
      return config;
    }
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    console.warn('Using default development database configuration...');
    return {
      user: 'neondb_owner',
      password: 'fpBXEsTct9g1',
      host: 'ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech',
      database: 'neondb',
      ssl: true,
    };
  }

  // If no configuration is available, throw an error
  throw new Error(
    'Database configuration is missing. Please set either DATABASE_URL or individual database environment variables (PGUSER, PGPASSWORD, PGHOST, PGDATABASE).'
  );
}

// Get database configuration
const dbConfig = getDatabaseConfig();

// Create the pool with validated configuration
const pool = new Pool({
  ...dbConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Add event listeners for pool error handling
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

// Test the connection
let isConnected = false;

async function testConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT NOW()');
      isConnected = true;
      console.log('Database connection successful');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database connection failed:', err);
    isConnected = false;
  }
}

// Initial connection test
testConnection();

export default pool;
export { isConnected, testConnection }; 