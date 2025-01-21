import type { Config } from 'drizzle-kit';

export default {
  schema: './lib/schema.ts',
  driver: 'better-sqlite',
  dbCredentials: {
    url: 'sqlite.db'
  },
  verbose: true,
  strict: true,
} satisfies Config; 