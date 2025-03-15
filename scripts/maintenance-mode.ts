import { config } from 'dotenv';
import { resolve } from 'path';
import { query } from '../lib/db';
import logger from '../lib/logger';

// Load environment variables
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

/**
 * Command-line utility to manage maintenance mode
 * Usage: 
 *   npm run maintenance on - Turn maintenance mode on
 *   npm run maintenance off - Turn maintenance mode off
 *   npm run maintenance status - Check current status
 */
async function manageMaintenanceMode() {
  try {
    logger.info('====================================');
    logger.info('  MAINTENANCE MODE MANAGER');
    logger.info('====================================');
    
    // Get command line arguments
    const [,, command = 'status'] = process.argv;
    
    // Check if settings table exists
    const tablesResult = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'settings'
    `);
    
    const tableExists = tablesResult.rows.length > 0;
    
    if (!tableExists) {
      logger.info('Settings table does not exist. Creating it...');
      
      await query(`
        CREATE TABLE IF NOT EXISTS settings (
          id TEXT PRIMARY KEY,
          key TEXT UNIQUE NOT NULL,
          value TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      logger.info('Settings table created.');
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
      
      logger.info('Maintenance mode setting created with default value: false');
    }
    
    // Get current value
    const refreshResult = await query(`
      SELECT * FROM settings WHERE key = 'maintenance_mode'
    `);
    
    const currentValue = refreshResult.rows[0].value;
    
    // Handle commands
    switch (command.toLowerCase()) {
      case 'on':
      case 'enable':
        if (currentValue === 'true') {
          logger.info('Maintenance mode is already enabled.');
        } else {
          await query(`
            UPDATE settings 
            SET value = 'true', updated_at = $1
            WHERE key = 'maintenance_mode'
          `, [new Date()]);
          
          logger.info('✅ Maintenance mode ENABLED successfully.');
        }
        break;
        
      case 'off':
      case 'disable':
        if (currentValue === 'false') {
          logger.info('Maintenance mode is already disabled.');
        } else {
          await query(`
            UPDATE settings 
            SET value = 'false', updated_at = $1
            WHERE key = 'maintenance_mode'
          `, [new Date()]);
          
          logger.info('✅ Maintenance mode DISABLED successfully.');
        }
        break;
        
      case 'status':
      default:
        logger.info(`Current maintenance mode status: ${currentValue === 'true' ? 'ENABLED' : 'DISABLED'}`);
        logger.info('To change status, use:');
        logger.info('  npm run maintenance on - Turn maintenance mode on');
        logger.info('  npm run maintenance off - Turn maintenance mode off');
        break;
    }
    
    logger.info('====================================');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error managing maintenance mode:', error);
    process.exit(1);
  }
}

// Run the script
manageMaintenanceMode(); 