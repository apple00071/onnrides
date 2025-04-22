import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    // Execute the SQL to add the missing column
    await query(`
      -- Drop existing index and constraint if they exist
      DROP INDEX IF EXISTS "idx_bookings_payment_intent_id";
      ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "bookings_payment_intent_id_key";

      -- Drop the column if it exists (to avoid errors)
      ALTER TABLE "bookings" DROP COLUMN IF EXISTS "payment_intent_id";

      -- Add the column fresh
      ALTER TABLE "bookings" ADD COLUMN "payment_intent_id" TEXT;

      -- Add unique constraint
      ALTER TABLE "bookings" ADD CONSTRAINT "bookings_payment_intent_id_key" UNIQUE ("payment_intent_id");

      -- Add index for faster lookups
      CREATE INDEX "idx_bookings_payment_intent_id" ON "bookings"("payment_intent_id");
    `);

    logger.info('Successfully fixed the database schema');

    return NextResponse.json({ 
      success: true, 
      message: 'Database schema fixed successfully' 
    });
  } catch (error) {
    logger.error('Error fixing database schema:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fix database schema',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 