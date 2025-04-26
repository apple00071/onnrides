import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import logger from '@/lib/logger';

// Create a direct database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// GET /api/settings - Get all settings or a specific setting by key
export async function GET(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    // First ensure the settings table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" TEXT PRIMARY KEY,
        "key" TEXT UNIQUE NOT NULL,
        "value" TEXT NOT NULL,
        "created_at" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP(6) NOT NULL DEFAULT NOW()
      )
    `);

    // Add index for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS "idx_settings_key" ON "settings"("key")
    `);

    // If key is provided, get specific setting
    if (key) {
      const { rows } = await client.query(
        'SELECT * FROM settings WHERE key = $1 LIMIT 1',
        [key]
      );

      if (rows.length === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Setting not found' 
        }, { status: 404 });
      }

      return NextResponse.json({ 
        success: true, 
        data: rows[0] 
      });
    }

    // Otherwise, get all settings
    const { rows } = await client.query(
      'SELECT * FROM settings ORDER BY key ASC'
    );

    return NextResponse.json({ 
      success: true, 
      data: rows 
    });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch settings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}

// POST /api/settings - Create or update a setting
export async function POST(request: NextRequest) {
  const client = await pool.connect();
  
  try {
    const body = await request.json();
    const { key, value } = body;

    // Validate required fields
    if (!key || value === undefined) {
      return NextResponse.json({ 
        success: false, 
        error: 'Key and value are required' 
      }, { status: 400 });
    }

    // Create table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" TEXT PRIMARY KEY,
        "key" TEXT UNIQUE NOT NULL,
        "value" TEXT NOT NULL,
        "created_at" TIMESTAMP(6) NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP(6) NOT NULL DEFAULT NOW()
      )
    `);

    // Check if setting exists
    const { rows } = await client.query(
      'SELECT * FROM settings WHERE key = $1',
      [key]
    );

    if (rows.length > 0) {
      // Update existing setting
      await client.query(
        'UPDATE settings SET value = $1, updated_at = NOW() WHERE key = $2',
        [String(value), key]
      );
    } else {
      // Create new setting
      await client.query(
        'INSERT INTO settings (id, key, value, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW())',
        [randomUUID(), key, String(value)]
      );
    }

    // Get the updated setting
    const { rows: updatedRows } = await client.query(
      'SELECT * FROM settings WHERE key = $1',
      [key]
    );

    logger.info('Setting updated:', { key, value });

    return NextResponse.json({ 
      success: true, 
      data: updatedRows[0]
    });
  } catch (error) {
    logger.error('Error updating setting:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to update setting',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    client.release();
  }
}

// DELETE /api/settings - Delete a setting (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Check for admin privileges
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized' 
      }, { status: 401 });
    }

    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key) {
      return NextResponse.json({ 
        success: false, 
        error: 'Key parameter is required' 
      }, { status: 400 });
    }

    // Delete the setting
    await prisma.settings.delete({
      where: { key }
    });

    logger.info('Setting deleted:', { key });

    return NextResponse.json({ 
      success: true, 
      message: 'Setting deleted successfully' 
    });
  } catch (error) {
    logger.error('Error deleting setting:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete setting',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 