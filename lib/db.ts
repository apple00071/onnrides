import { Pool } from 'pg';
import { Kysely, PostgresDialect } from 'kysely';
import type { Database } from './schema';

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
    throw new Error('Invalid database connection string');
  }
}

function getDatabaseConfig() {
  // First try DATABASE_URL
  if (process.env.DATABASE_URL) {
    const config = parseConnectionString(process.env.DATABASE_URL);
    if (config) {
      return {
        ...config,
        ssl: {
          rejectUnauthorized: false
        }
      };
    }
  }

  // Then try individual environment variables
  if (process.env.PGUSER && process.env.PGPASSWORD && process.env.PGHOST && process.env.PGDATABASE) {
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

  throw new Error('Database configuration is missing. Please check environment variables.');
}

// Get database configuration with error handling
const dbConfig = getDatabaseConfig();

// Create the pool with validated configuration
const pool = new Pool({
  ...dbConfig,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  statement_timeout: 30000,
  query_timeout: 30000,
});

// Export a wrapper function to handle connection errors
async function query(text: string, params?: any[]) {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    throw error;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Create a new Kysely instance with the PostgreSQL dialect
export const db = new Kysely<Database>({
  dialect: new PostgresDialect({
    pool,
  }),
});

// Export a function to get the database instance
export function getDb() {
  return db;
}

export default pool;
export { query }; 