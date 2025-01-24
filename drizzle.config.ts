import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

export default {
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'ep-long-dream-a6avbuml-pooler.us-west-2.aws.neon.tech',
    database: 'neondb',
    user: 'neondb_owner',
    password: 'fpBXEsTct9g1',
    ssl: true,
  },
} satisfies Config; 