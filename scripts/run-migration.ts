import logger from '@/lib/logger';
import pool from '../lib/db';
import fs from 'fs';
import path from 'path';

async function runMigration(migrationFile: string) {
  try {
    // Read the SQL file
    
    

    // Connect to the database
    
    try {
      // Execute the SQL commands
      await client.query(sqlContent);
      logger.debug(`Migration ${migrationFile} executed successfully`);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error running migration:', error);
    process.exit(1);
  }
}

// Get migration file from command line argument

if (!migrationFile) {
  logger.error('Please provide a migration file name');
  process.exit(1);
}

runMigration(migrationFile);

// Add empty export to make it a module
export {}; 