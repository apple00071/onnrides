import { Pool } from 'pg';

// Function to validate environment variables
function validateEnvVariables() {
  const required = ['PGUSER', 'PGPASSWORD', 'PGHOST', 'PGDATABASE'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please ensure all required environment variables are set in your deployment environment.');
    
    // In development, we can use default values
    if (process.env.NODE_ENV === 'development') {
      console.warn('Using default development database configuration...');
      return {
        user: process.env.PGUSER || 'neondb_owner',
        password: process.env.PGPASSWORD || 'fpBXEsTct9g1',
        host: process.env.PGHOST || 'ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech',
        database: process.env.PGDATABASE || 'neondb',
      };
    }
    
    throw new Error('Missing required environment variables. Check server logs for details.');
  }
  
  return {
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    host: process.env.PGHOST,
    database: process.env.PGDATABASE,
  };
}

// Get database configuration
const dbConfig = validateEnvVariables();

// Create the pool with validated configuration
const pool = new Pool({
  ...dbConfig,
  ssl: true,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Add event listeners for pool error handling
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
});

// Test the connection
pool.connect().then(client => {
  client
    .query('SELECT NOW()')
    .then(result => {
      console.log('Database connection successful');
    })
    .catch(err => {
      console.error('Error executing query', err.stack);
    })
    .finally(() => {
      client.release();
    });
}).catch(err => {
  console.error('Error acquiring client', err.stack);
});

export default pool; 