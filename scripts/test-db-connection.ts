import pool from '../lib/db';
import { PoolClient, QueryResult } from 'pg';

async function testConnection() {
  let client: PoolClient | undefined;
  try {
    console.log('Testing database connection...');
    
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
      database: pool.options.database,
      host: pool.options.host,
      port: pool.options.port,
      user: pool.options.user,
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