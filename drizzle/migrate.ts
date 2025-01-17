import { drizzle } from 'drizzle-orm/vercel-postgres';
import { migrate } from 'drizzle-orm/vercel-postgres/migrator';
import { sql } from '@vercel/postgres';

async function runMigrations() {
  const db = drizzle(sql);

  console.log('Running migrations...');

  await migrate(db, { migrationsFolder: 'drizzle/migrations' });

  console.log('Migrations completed!');
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error('Migration failed!', err);
  process.exit(1);
}); 