import { config } from 'dotenv';
import { resolve } from 'path';
import { query } from '../lib/db';
import logger from '../lib/logger';

// Load environment variables
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

/**
 * Test script to check and toggle maintenance mode
 */
async function testMaintenanceMode() {
  try {
    logger.info('====================================');
    logger.info('  MAINTENANCE MODE TEST SCRIPT');
    logger.info('====================================');
    
    // Check if settings table exists
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'settings'
    `);
    
    const tableExists = tablesResult.rows.length > 0;
    logger.info(`Settings table exists: ${tableExists}`);
    
    if (!tableExists) {
      logger.info('Creating settings table...');
      
      await query(`
        CREATE TABLE IF NOT EXISTS settings (
          id TEXT PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      logger.info('Settings table created successfully');
    }
    
    // Check if maintenance_mode setting exists
    const settingResult = await query(`
      SELECT * FROM settings WHERE key = 'maintenance_mode'
    `);
    
    if (settingResult.rows.length === 0) {
      logger.info('Maintenance mode setting not found, creating it...');
      
      await query(`
        INSERT INTO settings (id, key, value, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5)
      `, ['maintenance_mode', 'maintenance_mode', 'false', new Date(), new Date()]);
      
      logger.info('Maintenance mode setting created and set to false');
    } else {
      const currentValue = settingResult.rows[0].value;
      logger.info(`Current maintenance mode value: ${currentValue}`);
      
      // Toggle the maintenance mode
      const newValue = currentValue === 'true' ? 'false' : 'true';
      
      await query(`
        UPDATE settings 
        SET value = $1, updated_at = $2
        WHERE key = 'maintenance_mode'
      `, [newValue, new Date()]);
      
      logger.info(`Maintenance mode toggled to: ${newValue}`);
    }
    
    // Verify the current setting
    const updatedSetting = await query(`
      SELECT * FROM settings WHERE key = 'maintenance_mode'
    `);
    
    if (updatedSetting.rows.length > 0) {
      logger.info(`Verified maintenance mode is now: ${updatedSetting.rows[0].value}`);
    }
    
    logger.info('====================================');
    logger.info('Test completed successfully');
    logger.info('====================================');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error in maintenance mode test:', error);
    process.exit(1);
  }
}

// Run the test
testMaintenanceMode(); 