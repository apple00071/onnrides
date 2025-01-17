import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.POSTGRES_URL) {
  throw new Error('POSTGRES_URL is not defined');
}

var url = new URL(process.env.POSTGRES_URL);
var auth = url.username ? [url.username, url.password] : [];
var database = url.pathname.slice(1).split('?')[0];

export default {
  schema: './app/lib/schema.ts',
  out: './app/lib/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: url.hostname,
    user: auth[0],
    password: auth[1],
    database: database,
    ssl: true
  },
} satisfies Config; 