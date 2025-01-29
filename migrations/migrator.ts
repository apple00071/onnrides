import { logger } from '@/lib/logger';
import { promises as fs } from 'fs';
import path from 'path';
import { FileMigrationProvider, Kysely, Migrator, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { Database } from '@/lib/schema';

async function migrateToLatest() {
  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
      }),
    }),
  });

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder: path.join(__dirname),
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === 'Success') {
      logger.debug(`Migration "${it.migrationName}" was executed successfully`);
    } else if (it.status === 'Error') {
      logger.error(`Failed to execute migration "${it.migrationName}"`);
    }
  });

  if (error) {
    logger.error('Failed to migrate:');
    logger.error(error);
    process.exit(1);
  }

  await db.destroy();
}

migrateToLatest(); 