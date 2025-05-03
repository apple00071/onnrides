import { PrismaClient } from '@prisma/client';
import logger from './logger';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import { query } from '@/lib/db';

const prisma = new PrismaClient();

// Also initialize a direct DB connection for fallbacks
let pool: Pool | null = null;

// Only initialize the pool if we need it (lazy loading)
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      }
    });
  }
  return pool;
}

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

    try {
      // First attempt with Prisma
      const setting = await prisma.settings.findUnique({
        where: { key }
      });

      if (setting) {
        // Update cache
        cache[key] = {
          value: setting.value,
          expiresAt: Date.now() + CACHE_TTL
        };
        return setting.value;
      }
    } catch (prismaError) {
      logger.error('Prisma error fetching setting:', { key, error: prismaError });
      
      // If Prisma fails, try direct database access
      try {
        logger.info('Falling back to direct database access for setting:', key);
        const pool = getPool();
        const client = await pool.connect();
        
        try {
          // Ensure table exists first
          await client.query(`
            CREATE TABLE IF NOT EXISTS "settings" (
              "id" TEXT PRIMARY KEY,
              "key" TEXT UNIQUE NOT NULL,
              "value" TEXT NOT NULL,
              "created_at" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
              "updated_at" TIMESTAMP(6) NOT NULL DEFAULT NOW()
            )
          `);
          
          // Try to get the setting
          const { rows } = await client.query(
            'SELECT value FROM settings WHERE key = $1',
            [key]
          );
          
          if (rows.length > 0) {
            // Update cache
            cache[key] = {
              value: rows[0].value,
              expiresAt: Date.now() + CACHE_TTL
            };
            return rows[0].value;
          }
          
          // If setting doesn't exist, create it with default value
          if (defaultValue) {
            await client.query(
              `INSERT INTO settings (id, key, value, created_at, updated_at)
               VALUES ($1, $2, $3, NOW(), NOW())
               ON CONFLICT (key) DO NOTHING`,
              [randomUUID(), key, defaultValue]
            );
            
            // Update cache
            cache[key] = {
              value: defaultValue,
              expiresAt: Date.now() + CACHE_TTL
            };
          }
        } finally {
          client.release();
        }
      } catch (directDbError) {
        logger.error('Direct database access for setting also failed:', { key, error: directDbError });
      }
    }

    return defaultValue;
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
    try {
      // First try with Prisma
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
    } catch (prismaError) {
      logger.error('Prisma error setting value:', { key, value, error: prismaError });
      
      // If Prisma fails, try direct database access
      try {
        logger.info('Falling back to direct database access to set setting:', key);
        const pool = getPool();
        const client = await pool.connect();
        
        try {
          // Ensure table exists first
          await client.query(`
            CREATE TABLE IF NOT EXISTS "settings" (
              "id" TEXT PRIMARY KEY,
              "key" TEXT UNIQUE NOT NULL,
              "value" TEXT NOT NULL,
              "created_at" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
              "updated_at" TIMESTAMP(6) NOT NULL DEFAULT NOW()
            )
          `);
          
          // Try to update the setting
          await client.query(
            `INSERT INTO settings (id, key, value, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())
             ON CONFLICT (key) DO UPDATE SET value = $3, updated_at = NOW()`,
            [randomUUID(), key, value]
          );
        } finally {
          client.release();
        }
      } catch (directDbError) {
        logger.error('Direct database access to set setting also failed:', { key, value, error: directDbError });
        return false;
      }
    }

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
  try {
    const result = await query(`
      SELECT value FROM settings 
      WHERE key = $1 
      LIMIT 1
    `, [key]);
    
    return result.rows[0]?.value?.toLowerCase() === 'true';
  } catch (error) {
    logger.error(`Error getting boolean setting ${key}:`, error);
    return defaultValue;
  }
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
  BOOKING_SERVICE_FEE_PERCENTAGE: 'booking_service_fee_percentage',
  GST_ENABLED: 'gst_enabled'
} as const; 