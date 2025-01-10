import logger from '@/lib/logger';
import pool from '../lib/db';
import fs from 'fs';
import path from 'path';

async function initializeDatabase() {
  try {
    // Read the SQL file
    
    

    // Connect to the database
    
    try {
      // Execute the SQL commands
      await client.query(sqlContent);
      logger.debug('Database initialized successfully');
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error initializing database:', error);
  }
}

initializeDatabase(); 