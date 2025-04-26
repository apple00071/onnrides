import { getSetting, setSetting, getBooleanSetting } from '../lib/settings';
import logger from '../lib/logger';

async function testSettings() {
  try {
    logger.info('Testing settings functionality...');
    
    // Try to get maintenance_mode setting
    const maintenanceMode = await getSetting('maintenance_mode');
    logger.info('Current maintenance_mode value:', maintenanceMode);
    
    // Try to get it as boolean
    const maintenanceModeBoolean = await getBooleanSetting('maintenance_mode');
    logger.info('Current maintenance_mode as boolean:', maintenanceModeBoolean);
    
    // Try to update it to the opposite value
    const newValue = !maintenanceModeBoolean;
    logger.info('Setting maintenance_mode to:', newValue);
    await setSetting('maintenance_mode', String(newValue));
    
    // Verify the update
    const updatedValue = await getBooleanSetting('maintenance_mode');
    logger.info('Updated maintenance_mode value:', updatedValue);
    
    // Set it back to the original value
    logger.info('Restoring original value');
    await setSetting('maintenance_mode', String(maintenanceModeBoolean));
    
    // Verify restoration
    const restoredValue = await getBooleanSetting('maintenance_mode');
    logger.info('Restored maintenance_mode value:', restoredValue);
    
    logger.info('Settings test completed successfully!');
  } catch (error) {
    logger.error('Error testing settings:', error);
  }
}

// Run the test
testSettings()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Unhandled error in settings test:', error);
    process.exit(1);
  }); 