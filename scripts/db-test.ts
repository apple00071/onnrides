import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from 'dotenv';

// Load environment variables
config();

// Create a pool with the connection string
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

async function testConnection() {
  let client: PoolClient | undefined;
  try {
    console.log('Testing database connection...');
    
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    // Try to connect with timeout
    client = await Promise.race([
      pool.connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout')), 10000)
      )
    ]) as PoolClient;

    // Test query with timeout
    const result = await Promise.race([
      client.query('SELECT NOW() as now'),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Query timeout')), 5000)
      )
    ]) as QueryResult<{ now: Date }>;

    console.log('Database connection successful!');
    console.log('Database timestamp:', result.rows[0].now);
    console.log('Connection info:', {
      connectionString: process.env.DATABASE_URL?.replace(/:[^:@]{1,}@/, ':****@'),
      max: pool.options.max,
      ssl: !!pool.options.ssl
    });

  } catch (err) {
    console.error('Database connection error:', {
      error: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : undefined
    });
    process.exit(1);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the test
testConnection(); 