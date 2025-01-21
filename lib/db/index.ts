import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

// Configure Neon client
neonConfig.fetchConnectionCache = true;

// Create the SQL client with explicit type parameters
const sql = neon<boolean, boolean>(connectionString);

// Create the database instance
export const db = drizzle(sql, { schema });

// Note: Neon DB handles connection pooling automatically through their serverless driver 