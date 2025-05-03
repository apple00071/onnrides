import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

interface Setting {
  id: string;
  key: string;
  value: string;
  created_at: Date;
  updated_at: Date;
}

const SETTINGS = {
  MAINTENANCE_MODE: 'maintenance_mode',
  GST_ENABLED: 'gst_enabled',
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (key) {
      const result = await query(`
        SELECT id, key, value, created_at, updated_at
        FROM settings
        WHERE key = $1
        LIMIT 1
      `, [key]);
      return NextResponse.json({ success: true, data: result.rows[0] });
    }

    const result = await query(`
      SELECT id, key, value, created_at, updated_at
      FROM settings
    `);
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role?.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { key, value } = await request.json();

    if (!key || value === undefined) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // First try to find the existing setting
    const existingResult = await query(`
      SELECT id, key, value, created_at, updated_at
      FROM settings
      WHERE key = $1
      LIMIT 1
    `, [key]);

    const existingSetting = existingResult.rows[0] as Setting;
    let setting: Setting;

    if (existingSetting) {
      // Update existing setting
      const updateResult = await query(`
        UPDATE settings
        SET value = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, key, value, created_at, updated_at
      `, [value, existingSetting.id]);
      setting = updateResult.rows[0];
    } else {
      // Create new setting with a generated id
      const id = randomUUID();
      const insertResult = await query(`
        INSERT INTO settings (id, key, value, created_at, updated_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        RETURNING id, key, value, created_at, updated_at
      `, [id, key, value]);
      setting = insertResult.rows[0];
    }

    logger.info(`Setting ${existingSetting ? 'updated' : 'created'}: ${key} = ${value}`);
    return NextResponse.json({ success: true, data: setting });
  } catch (error) {
    logger.error('Error updating setting:', error);
    return NextResponse.json({ success: false, error: 'Failed to update setting' }, { status: 500 });
  }
}

// Initialize settings endpoint
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role?.includes('admin')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Initialize default settings if they don't exist
    const defaultSettings = [
      { key: SETTINGS.MAINTENANCE_MODE, value: 'false' },
      { key: SETTINGS.GST_ENABLED, value: 'false' },
    ];

    const results = await Promise.all(
      defaultSettings.map(async (setting) => {
        const existingResult = await query(`
          SELECT id, key, value, created_at, updated_at
          FROM settings
          WHERE key = $1
          LIMIT 1
        `, [setting.key]);

        const existing = existingResult.rows[0] as Setting;
        if (existing) {
          return existing;
        }

        const id = randomUUID();
        const insertResult = await query(`
          INSERT INTO settings (id, key, value, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          RETURNING id, key, value, created_at, updated_at
        `, [id, setting.key, setting.value]);

        return insertResult.rows[0] as Setting;
      })
    );

    logger.info('Settings initialized');
    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    logger.error('Error initializing settings:', error);
    return NextResponse.json({ success: false, error: 'Failed to initialize settings' }, { status: 500 });
  }
} 