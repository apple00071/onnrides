import { query, initializeDatabase, closePool } from '@/lib/db';
import logger from '@/lib/logger';

function validateDatabaseUrl() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) {
    throw new Error('Database URL is not configured');
  }

  try {
    const parsedUrl = new URL(url);
    // Remove password from logging
    parsedUrl.password = '****';
    logger.info('Database configuration:', {
      host: parsedUrl.hostname,
      port: parsedUrl.port,
      database: parsedUrl.pathname.slice(1),
      user: parsedUrl.username,
      ssl: parsedUrl.searchParams.get('sslmode') === 'require'
    });
  } catch (error) {
    throw new Error('Invalid database URL format');
  }
}

async function validateDatabaseConfig() {
  try {
    // Validate URL format first
    validateDatabaseUrl();

    logger.info('Validating database configuration...', {
      nodeEnv: process.env.NODE_ENV
    });

    // Test basic connectivity with retry
    let connected = false;
    let retries = 3;
    let lastError;

    while (retries > 0 && !connected) {
      try {
        const result = await query('SELECT version(), current_database(), current_user');
        const { version, current_database, current_user } = result.rows[0];
        
        logger.info('Database connection successful', {
          version,
          database: current_database,
          user: current_user
        });
        
        connected = true;
      } catch (error) {
        lastError = error;
        retries--;
        if (retries > 0) {
          logger.warn(`Connection attempt failed, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!connected) {
      throw lastError || new Error('Failed to connect to database after all retries');
    }

    // Check required tables
    const tables = ['users', 'vehicles', 'bookings', 'settings'];
    for (const table of tables) {
      const tableResult = await query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        )
      `, [table]);

      const exists = tableResult.rows[0].exists;
      if (!exists) {
        logger.error(`Required table "${table}" is missing`);
      } else {
        logger.info(`Table "${table}" exists`);
      }
    }

    // Test write permission
    await query(`
      INSERT INTO settings (key, value, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE
      SET value = $2, updated_at = NOW()
    `, ['db_check', 'ok']);

    logger.info('Database write permission confirmed');

    return true;
  } catch (error) {
    logger.error('Database validation failed:', {
      error: error instanceof Error ? {
        message: error.message,
        code: (error as any).code,
        detail: (error as any).detail
      } : error
    });
    return false;
  }
}

async function main() {
  try {
    logger.info('Starting database initialization...');
    
    const isInitialized = await initializeDatabase();
    if (!isInitialized) {
      throw new Error('Failed to initialize database');
    }

    const isValid = await validateDatabaseConfig();
    if (!isValid) {
      throw new Error('Database validation failed');
    }

    logger.info('Database initialization completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

// Run if called directly
if (require.main === module) {
  main();
} 