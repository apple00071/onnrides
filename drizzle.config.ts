import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL is not defined');
}

export default {
  schema: './app/lib/lib/schema.ts',
  out: './app/lib/lib/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.POSTGRES_URL,
  },
} satisfies Config; 