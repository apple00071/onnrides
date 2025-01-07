import { Pool } from 'pg';

if (!process.env.PGUSER || !process.env.PGPASSWORD || !process.env.PGHOST || !process.env.PGDATABASE) {
  throw new Error('Missing database configuration environment variables');
}

const pool = new Pool({
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  ssl: true,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait for a connection
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