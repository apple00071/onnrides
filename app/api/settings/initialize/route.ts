import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Create a direct database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * Initialize the settings table and required settings
 */
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    logger.info('API: Initializing settings table...');
    
    // First check if table exists, create if not
    await client.query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" TEXT PRIMARY KEY,
        "key" TEXT UNIQUE NOT NULL,
        "value" TEXT NOT NULL,
        "created_at" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP(6) NOT NULL DEFAULT NOW()
      )
    `);
    
    // Create index
    await client.query(`
      CREATE INDEX IF NOT EXISTS "idx_settings_key" ON "settings"("key")
    `);
    
    // Check for essential settings and create if missing
    const requiredSettings = [
      { key: 'maintenance_mode', value: 'false' },
      { key: 'site_name', value: 'OnnRides' },
      { key: 'gst_enabled', value: 'false' }
    ];
    
    for (const setting of requiredSettings) {
      const { rows } = await client.query(
        'SELECT * FROM settings WHERE key = $1',
        [setting.key]
      );
      
      if (rows.length === 0) {
        await client.query(
          `INSERT INTO "settings" ("id", "key", "value", "created_at", "updated_at")
           VALUES ($1, $2, $3, NOW(), NOW())`,
          [randomUUID(), setting.key, setting.value]
        );
        logger.info(`API: Created ${setting.key} setting with value: ${setting.value}`);
      } else {
        logger.info(`API: Setting ${setting.key} already exists with value: ${rows[0].value}`);
      }
    }
    
    // Get all settings to verify everything is set up
    const { rows: allSettings } = await client.query('SELECT * FROM settings');
    logger.info(`API: Settings table initialized with ${allSettings.length} settings`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Settings table initialized',
      settings: allSettings
    });
  } catch (error) {
    logger.error('API: Error initializing settings:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to initialize settings'
    }, { status: 500 });
  } finally {
    client.release();
  }
} 