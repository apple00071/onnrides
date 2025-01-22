import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';

async function runMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql as any);

  console.log('Running migrations...');

  await migrate(db, { migrationsFolder: 'drizzle' });

  console.log('Migrations completed!');
  process.exit(0);
}

runMigration().catch((err) => {
  console.error('Migration failed!', err);
  process.exit(1);
}); 