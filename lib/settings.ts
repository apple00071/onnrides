import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

// In-memory cache for settings
// This will reduce database calls for frequently accessed settings
type SettingsCache = {
  [key: string]: {
    value: string;
    expiresAt: number;
  };
};

const cache: SettingsCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get a setting value by key
 * @param key Setting key
 * @param defaultValue Default value if setting is not found
 * @param skipCache Whether to skip the cache and force database fetch
 * @returns The setting value or default value if not found
 */
export async function getSetting(
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

/**
 * Set a setting value
 * @param key Setting key
 * @param value Setting value
 * @returns True if setting was updated successfully, false otherwise
 */
export async function setSetting(key: string, value: string): Promise<boolean> {
  try {
    await prisma.settings.upsert({
      where: { key },
      update: { 
        value, 
        updated_at: new Date() 
      },
      create: {
        id: crypto.randomUUID(),
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

/**
 * Get a boolean setting value
 * @param key Setting key
 * @param defaultValue Default value if setting is not found
 * @returns The setting value as boolean
 */
export async function getBooleanSetting(
  key: string, 
  defaultValue: boolean = false
): Promise<boolean> {
  const value = await getSetting(key, String(defaultValue));
  return value.toLowerCase() === 'true';
}

/**
 * Get a numeric setting value
 * @param key Setting key
 * @param defaultValue Default value if setting is not found
 * @returns The setting value as number
 */
export async function getNumericSetting(
  key: string, 
  defaultValue: number = 0
): Promise<number> {
  const value = await getSetting(key, String(defaultValue));
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Clear the settings cache
 */
export function clearSettingsCache(): void {
  Object.keys(cache).forEach(key => {
    delete cache[key];
  });
}

// Common settings keys
export const SETTINGS = {
  MAINTENANCE_MODE: 'maintenance_mode',
  SITE_NAME: 'site_name',
  SUPPORT_EMAIL: 'support_email',
  SUPPORT_PHONE: 'support_phone',
  BOOKING_ADVANCE_PAYMENT_PERCENTAGE: 'booking_advance_payment_percentage',
  BOOKING_GST_PERCENTAGE: 'booking_gst_percentage',
  BOOKING_SERVICE_FEE_PERCENTAGE: 'booking_service_fee_percentage'
}; 