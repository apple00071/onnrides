import logger from '@/lib/logger';




async function migrate() {
  // Load environment variables from .env.local if it exists
  try {
    
    envConfig.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  } catch (error) {
    logger.debug('No .env.local file found, using existing environment variables');
  }

  

  try {
    
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
      
      
      
          
          return numA - numB;
        });

      // Execute each migration file that hasn&apos;t been run yet
      for (const file of sqlFiles) {
        
        
        // Check if migration has already been executed
        const { rows } = await client.query(
          'SELECT id FROM migrations WHERE name = $1',
          [migrationName]
        );

        if (rows.length === 0) {
          logger.debug(`Running migration: ${file}`);
          
          

          await client.query('BEGIN');
          try {
            await client.query(sql);
            await client.query(
              'INSERT INTO migrations (name) VALUES ($1)',
              [migrationName]
            );
            await client.query('COMMIT');
            logger.debug(`Migration ${file} completed successfully`);
          } catch (error) {
            await client.query('ROLLBACK');
            throw error;
          }
        } else {
          logger.debug(`Skipping migration ${file} (already executed)`);
        }
      }
      
      logger.debug('All migrations completed successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migrations
migrate(); 