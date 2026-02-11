import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Initialize the settings table and required settings
 */
export async function GET(request: NextRequest) {
  try {
    // S-Verify: This was public! Added admin security check.
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role?.toLowerCase() !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized access' }, { status: 403 });
    }

    logger.info('API: Initializing settings table...');

    // First check if table exists, create if not
    await query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" TEXT PRIMARY KEY,
        "key" TEXT UNIQUE NOT NULL,
        "value" TEXT NOT NULL,
        "created_at" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP(6) NOT NULL DEFAULT NOW()
      )
    `);

    // Create index
    await query(`
      CREATE INDEX IF NOT EXISTS "idx_settings_key" ON "settings"("key")
    `);

    // Check for essential settings and create if missing
    const requiredSettings = [
      { key: 'maintenance_mode', value: 'false' },
      { key: 'site_name', value: 'OnnRides' },
      { key: 'gst_enabled', value: 'false' }
    ];

    for (const setting of requiredSettings) {
      const { rows } = await query(
        'SELECT * FROM settings WHERE key = $1',
        [setting.key]
      );

      if (rows.length === 0) {
        await query(
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
    const { rows: allSettings } = await query('SELECT * FROM settings');
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
  }
}