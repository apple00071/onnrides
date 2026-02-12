import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Auth check: admin only
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // First check and fix settings table
    const settingsTableExists = await query(`
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_name = 'settings'
      );
    `);

    if (!settingsTableExists.rows[0].exists) {
      await query(`
        CREATE TABLE settings (
          id SERIAL PRIMARY KEY,
          key TEXT NOT NULL UNIQUE,
          value TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        INSERT INTO settings (key, value) VALUES
        ('maintenance_mode', 'false'),
        ('gst_enabled', 'false')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      `);
    }

    // Fix any integer values stored as text in settings
    await query(`
      UPDATE settings 
      SET value = CASE 
        WHEN value::text = '1' THEN 'true'
        WHEN value::text = '0' THEN 'false'
        ELSE value 
      END
      WHERE (key = 'maintenance_mode' OR key = 'gst_enabled')
      AND value::text IN ('0', '1');
    `);

    // Then proceed with bookings table modifications
    await query('DROP VIEW IF EXISTS bookings_view CASCADE');

    await query(`
      -- Drop existing index and constraint if they exist
      DROP INDEX IF EXISTS "idx_bookings_payment_intent_id";
      
      -- Add new columns if they don't exist
      DO $$ 
      BEGIN 
        BEGIN
          ALTER TABLE bookings 
            ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS payment_intent_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS payment_details JSONB;
        EXCEPTION 
          WHEN duplicate_column THEN 
            NULL;
        END;
      END $$;
      
      -- Create index on payment_intent_id if it doesn't exist
      CREATE INDEX IF NOT EXISTS idx_bookings_payment_intent_id 
      ON bookings(payment_intent_id);
      
      -- Recreate the bookings view ensuring it is explicitly security invoker
      DROP VIEW IF EXISTS bookings_view CASCADE;
      CREATE OR REPLACE VIEW bookings_view 
      WITH (security_invoker = true)
      AS
      SELECT 
        b.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        v.name as vehicle_name,
        v.type as vehicle_type
      FROM bookings b
      LEFT JOIN users u ON b.user_id::text = u.id::text
      LEFT JOIN vehicles v ON b.vehicle_id::text = v.id::text;
    `);

    logger.info('Database schema updated successfully');

    return NextResponse.json({
      success: true,
      message: 'Database schema updated successfully'
    });
  } catch (error) {
    logger.error('Error fixing database schema:', error);
    return NextResponse.json(
      { error: 'Failed to update database schema' },
      { status: 500 }
    );
  }
} 