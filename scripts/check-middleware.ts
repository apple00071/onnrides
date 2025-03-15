import { config } from 'dotenv';
import { resolve } from 'path';
import axios from 'axios';
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
    logger.info('  MAINTENANCE MIDDLEWARE TEST');
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
    
    // 2. Check the API endpoint
    try {
      const response = await axios.get('http://localhost:3000/api/maintenance/check');
      logger.info(`API response: ${JSON.stringify(response.data)}`);
      
      if (response.data.maintenance !== (currentValue === 'true')) {
        logger.warn(`Warning: API response (${response.data.maintenance}) does not match database value (${currentValue})`);
      }
    } catch (error) {
      logger.error('Error calling maintenance check API:', error);
    }
    
    // 3. Set maintenance mode to true for testing
    if (currentValue !== 'true') {
      logger.info('Setting maintenance mode to true for testing');
      
      await query(`
        UPDATE settings 
        SET value = $1, updated_at = $2
        WHERE key = 'maintenance_mode'
      `, ['true', new Date()]);
      
      logger.info('Maintenance mode set to true');
    }
    
    // 4. Wait a moment for cache to potentially expire
    logger.info('Waiting 2 seconds for potential cache expiration...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Check the home page (should redirect to maintenance)
    try {
      const response = await axios.get('http://localhost:3000', {
        maxRedirects: 0,
        validateStatus: status => status >= 200 && status < 400
      }).catch(error => {
        if (error.response && error.response.status === 302) {
          const redirectUrl = error.response.headers.location;
          logger.info(`Home page redirects to: ${redirectUrl}`);
          
          if (redirectUrl.includes('/maintenance')) {
            logger.info('✅ Middleware is working correctly - redirects to maintenance page');
          } else {
            logger.warn(`❌ Middleware is NOT working correctly - redirects to ${redirectUrl} instead of maintenance page`);
          }
          return error.response;
        }
        throw error;
      });
      
      if (response.status !== 302) {
        logger.warn('❌ Middleware is NOT working correctly - home page did not redirect');
      }
    } catch (error) {
      logger.error('Error testing home page redirection:', error);
    }
    
    // 6. Set maintenance mode back to original value
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