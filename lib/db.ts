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
  // Log environment for debugging
  console.log('Environment Debug Info:');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('VERCEL_ENV:', process.env.VERCEL_ENV);
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  if (process.env.DATABASE_URL) {
    // Log the database URL structure (without credentials)
    try {
      const url = new URL(process.env.DATABASE_URL);
      console.log('Database URL structure:', {
        host: url.hostname,
        port: url.port,
        pathname: url.pathname,
        protocol: url.protocol,
        searchParams: url.searchParams.toString()
      });
    } catch (e) {
      console.error('Failed to parse DATABASE_URL:', e);
    }
  }

  // First try DATABASE_URL
  if (process.env.DATABASE_URL) {
    console.log('Attempting to use DATABASE_URL configuration');
    const config = parseConnectionString(process.env.DATABASE_URL);
    if (config) {
      return {
        ...config,
        ssl: {
          rejectUnauthorized: false
        }
      };
    } else {
      console.error('Failed to parse DATABASE_URL');
    }
  }

  // Then try individual environment variables
  if (process.env.PGUSER && process.env.PGPASSWORD && process.env.PGHOST && process.env.PGDATABASE) {
    console.log('Attempting to use individual PG* environment variables');
    return {
      user: process.env.PGUSER,
      password: process.env.PGPASSWORD,
      host: process.env.PGHOST,
      database: process.env.PGDATABASE,
      ssl: {
        rejectUnauthorized: false
      }
    };
  }

  // Development fallback
  if (process.env.NODE_ENV === 'development') {
    console.warn('Using development database configuration');
    return {
      user: 'neondb_owner',
      password: 'fpBXEsTct9g1',
      host: 'ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech',
      database: 'neondb',
      ssl: {
        rejectUnauthorized: false
      }
    };
  }

  throw new Error(
    'Database configuration is missing. Please check environment variables.'
  );
}

// Get database configuration with error handling
let dbConfig;
try {
  dbConfig = getDatabaseConfig();
  console.log('Database configuration generated successfully:', {
    host: dbConfig.host,
    database: dbConfig.database,
    user: dbConfig.user,
    ssl: !!dbConfig.ssl
  });
} catch (error) {
  console.error('Failed to generate database configuration:', error);
  throw error;
}

// Create the pool with validated configuration
const pool = new Pool({
  ...dbConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
  query_timeout: 30000,
});

// Add event listeners for pool error handling
pool.on('error', (err) => {
  console.error('Pool error:', err);
  if (err instanceof Error && err.message.includes('SSL')) {
    console.error('SSL-related error detected. Please check SSL configuration.');
  }
});

pool.on('connect', () => {
  console.log('New database connection established');
});

pool.on('acquire', () => {
  console.log('Database client acquired from pool');
});

pool.on('remove', () => {
  console.log('Database client removed from pool');
});

// Test the connection
let isConnected = false;

async function testConnection() {
  let client;
  try {
    console.log('Testing database connection...');
    client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    isConnected = true;
    console.log('Database connection test successful:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection test failed:');
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);

      if (error.message.includes('SSL')) {
        console.error('SSL Error: Please check SSL configuration');
      }
      if (error.message.includes('timeout')) {
        console.error('Timeout Error: Connection took too long');
      }
      if (error.message.includes('authentication')) {
        console.error('Authentication Error: Check credentials');
      }
    } else {
      console.error('Unknown error:', error);
    }
    isConnected = false;
    return false;
  } finally {
    if (client) {
      client.release();
      console.log('Test connection client released');
    }
  }
}

// Export a wrapper function to handle connection errors
async function query(text: string, params?: any[]) {
  let client;
  try {
    client = await pool.connect();
    const start = Date.now();
    const result = await client.query(text, params);
    const duration = Date.now() - start;
    console.log('Query executed successfully:', {
      text,
      duration,
      rowCount: result.rowCount
    });
    return result;
  } catch (error) {
    console.error('Query execution failed:', {
      text,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Initial connection test
testConnection().then(success => {
  if (!success) {
    console.error('Initial connection test failed - application may not work correctly');
  }
}).catch(error => {
  console.error('Failed to run initial connection test:', 
    error instanceof Error ? error.message : 'Unknown error'
  );
});

export default pool;
export { isConnected, testConnection, query }; 