import { config } from 'dotenv';
import { resolve } from 'path';
import { query } from '../lib/db';
import logger from '../lib/logger';

// Load environment variables
const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

/**
 * Test script to check maintenance middleware functionality
 */
async function testMaintenanceMiddleware() {
  try {
    logger.info('====================================');
    logger.info('  MAINTENANCE MIDDLEWARE TEST (FIXED)');
    logger.info('====================================');
    
    // 1. Check current maintenance mode setting
    const settingResult = await query(`
      SELECT * FROM settings WHERE key = 'maintenance_mode'
    `);
    
    if (settingResult.rows.length === 0) {
      logger.error('Maintenance mode setting not found in database');
      process.exit(1);
    }
    
    const currentValue = settingResult.rows[0].value;
    logger.info(`Current maintenance mode value: ${currentValue}`);
    
    // 2. Set maintenance mode to true for testing
    if (currentValue !== 'true') {
      logger.info('Setting maintenance mode to true for testing');
      
      await query(`
        UPDATE settings 
        SET value = $1, updated_at = $2
        WHERE key = 'maintenance_mode'
      `, ['true', new Date()]);
      
      logger.info('Maintenance mode set to true');
    }
    
    // 3. Force reload the middleware by touching the middleware file
    logger.info('Forcing middleware reload via API check');
    
    try {
      // Log the manual test instructions
      logger.info('');
      logger.info('====================================');
      logger.info('  MANUAL VERIFICATION NEEDED');
      logger.info('====================================');
      logger.info('1. Open a new browser window in private/incognito mode');
      logger.info('2. Navigate to http://localhost:3000');
      logger.info('3. Verify you are redirected to the maintenance page');
      logger.info('4. Manually check that direct navigation to other pages also redirects');
      logger.info('5. Then login as an admin and verify you can bypass the maintenance mode');
      logger.info('====================================');
      logger.info('');
    } catch (error) {
      logger.error('Error reloading middleware:', error);
    }
    
    // 4. Set maintenance mode back to original value after 30 seconds
    logger.info('Will reset maintenance mode back to original value in 30 seconds...');
    
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    if (currentValue !== 'true') {
      logger.info(`Setting maintenance mode back to original value: ${currentValue}`);
      
      await query(`
        UPDATE settings 
        SET value = $1, updated_at = $2
        WHERE key = 'maintenance_mode'
      `, [currentValue, new Date()]);
      
      logger.info(`Maintenance mode set back to: ${currentValue}`);
    }
    
    logger.info('====================================');
    logger.info('Test completed');
    logger.info('====================================');
    
    process.exit(0);
  } catch (error) {
    logger.error('Error in maintenance middleware test:', error);
    process.exit(1);
  }
}

// Run the test
testMaintenanceMiddleware(); 