import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL is not defined');
}

const url = new URL(process.env.POSTGRES_URL);
const [user, password] = url.username ? [url.username, url.password] : [];
const database = url.pathname.slice(1).split('?')[0];

export default {
  schema: './app/lib/lib/schema.ts',
  out: './app/lib/lib/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: url.hostname,
    user,
    password,
    database,
    ssl: true
  },
} satisfies Config; 