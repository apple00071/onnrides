import { randomUUID } from 'crypto';
import { query } from '../lib/db';
import logger from '../lib/logger';
import { SETTINGS } from '../lib/settings';

async function setupSettings() {
  try {
    logger.info('Setting up initial settings...');

    // Check if maintenance mode setting exists
    const result = await query(`
      SELECT value FROM settings 
      WHERE key = $1 
      LIMIT 1
    `, [SETTINGS.MAINTENANCE_MODE]);

    if (result.rows.length === 0) {
      // Create maintenance mode setting
      await query(`
        INSERT INTO settings (id, key, value, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
      `, [randomUUID(), SETTINGS.MAINTENANCE_MODE, 'false']);

      logger.info('✅ Maintenance mode setting created successfully');
    } else {
      logger.info('Maintenance mode setting already exists');
    }

    logger.info('✅ Settings setup completed');
  } catch (error) {
    logger.error('Error setting up settings:', error);
    process.exit(1);
  }
}

// Run the setup
setupSettings(); 