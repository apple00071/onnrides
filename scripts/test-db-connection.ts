import logger from '@/lib/logger';
import pool from '../lib/db';

async function testConnection() {
  try {
    
    
    logger.debug('Database connection successful!');
    logger.debug('Current timestamp from database:', result.rows[0].now);
    client.release();
  } catch (err) {
    logger.error('Database connection error:', err);
  } finally {
    await pool.end();
  }
}

testConnection(); 