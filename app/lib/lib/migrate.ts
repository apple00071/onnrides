import logger from '@/lib/logger';



import pg from 'pg';

const { Pool } = pg;

// Create a new pool specifically for migrations





async function runMigrations() {
  
  
  try {
    // Create migrations table if it doesn&apos;t exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Get list of migration files
    
    

    // Get executed migrations
    const { rows: executedMigrations } = await client.query(
      'SELECT name FROM migrations ORDER BY id'
    );
    

    // Run pending migrations
    for (const file of migrationFiles) {
      if (!executedMigrationNames.includes(file)) {
        logger.debug(`Running migration: ${file}`);
        
        

        await client.query('BEGIN');
        try {
          await client.query(migrationSql);
          await client.query(
            'INSERT INTO migrations (name) VALUES ($1)',
            [file]
          );
          await client.query('COMMIT');
          logger.debug(`Migration completed: ${file}`);
        } catch (error) {
          await client.query('ROLLBACK');
          logger.error(`Migration failed: ${file}`, error);
          throw error;
        }
      }
    }

    logger.debug('All migrations completed successfully');
  } catch (error) {
    logger.error('Migration error:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run migrations if this file is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(error => {
      logger.error('Migration failed:', error);
      process.exit(1);
    });
}

export default runMigrations; 