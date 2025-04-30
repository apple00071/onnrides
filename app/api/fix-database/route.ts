import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // First drop dependent views
    await query('DROP VIEW IF EXISTS bookings_view CASCADE');
    
    // Then proceed with table modifications
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
      
      -- Recreate the bookings view
      CREATE OR REPLACE VIEW bookings_view AS
      SELECT 
        b.*,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        v.name as vehicle_name,
        v.type as vehicle_type
      FROM bookings b
      LEFT JOIN users u ON b.user_id = u.id
      LEFT JOIN vehicles v ON b.vehicle_id = v.id;
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