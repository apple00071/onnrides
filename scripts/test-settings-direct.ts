// Import directly from the project root
import logger from '../lib/logger';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

// Cache implementation from settings.ts
type SettingsCache = {
  [key: string]: {
    value: string;
    expiresAt: number;
  };
};

const cache: SettingsCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Copy of the functions from settings.ts but with direct imports
async function getSetting(
  key: string, 
  defaultValue: string = '', 
  skipCache: boolean = false
): Promise<string> {
  try {
    // Check cache first if not skipping it
    if (!skipCache && cache[key] && cache[key].expiresAt > Date.now()) {
      return cache[key].value;
    }

    // Fetch from database
    const setting = await prisma.settings.findUnique({
      where: { key }
    });

    if (!setting) {
      return defaultValue;
    }

    // Update cache
    cache[key] = {
      value: setting.value,
      expiresAt: Date.now() + CACHE_TTL
    };

    return setting.value;
  } catch (error) {
    logger.error('Error fetching setting:', { key, error });
    return defaultValue;
  }
}

async function setSetting(key: string, value: string): Promise<boolean> {
  try {
    await prisma.settings.upsert({
      where: { key },
      update: { 
        value, 
        updated_at: new Date() 
      },
      create: {
        id: randomUUID(),
        key,
        value,
        created_at: new Date(),
        updated_at: new Date()
      }
    });

    // Update cache
    cache[key] = {
      value,
      expiresAt: Date.now() + CACHE_TTL
    };

    return true;
  } catch (error) {
    logger.error('Error setting value:', { key, value, error });
    return false;
  }
}

async function getBooleanSetting(
  key: string, 
  defaultValue: boolean = false
): Promise<boolean> {
  const value = await getSetting(key, String(defaultValue));
  return value.toLowerCase() === 'true';
}

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
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSettings()
  .then(() => process.exit(0))
  .catch((error) => {
    logger.error('Unhandled error in settings test:', error);
    process.exit(1);
  }); 