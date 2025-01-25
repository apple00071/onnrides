import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

var connectionString = process.env.DATABASE_URL!;
var url = new URL(connectionString);

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    host: url.hostname,
    port: parseInt(url.port),
    user: url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: true
  },
} satisfies Config; 