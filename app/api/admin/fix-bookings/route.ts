import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import logger from '@/lib/logger';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(request: NextRequest) {
    try {
        // Check admin authorization
        const session = await getServerSession(authOptions);
        if (!session?.user || session.user.role !== 'admin') {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        logger.info('Starting bookings table schema fix');

        // Run the migration SQL directly
        await query(`
      DO $$ 
      BEGIN 
          -- Drop and recreate status check constraint to allow more values
          ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
          ALTER TABLE bookings ADD CONSTRAINT bookings_status_check CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'active', 'failed'));

          -- Drop and recreate payment_status check constraint to allow more values
          ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
          ALTER TABLE bookings ADD CONSTRAINT bookings_payment_status_check CHECK (payment_status IN ('pending', 'paid', 'refunded', 'completed', 'failed', 'partially_paid'));

          -- Add pickup_location if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'pickup_location') THEN
              ALTER TABLE bookings ADD COLUMN pickup_location TEXT;
          END IF;

          -- Add dropoff_location if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'dropoff_location') THEN
              ALTER TABLE bookings ADD COLUMN dropoff_location TEXT;
          END IF;

          -- Fix payment_details type to JSONB if it's currently TEXT
          IF EXISTS (
              SELECT 1 
              FROM information_schema.columns 
              WHERE table_name = 'bookings' 
              AND column_name = 'payment_details' 
              AND data_type = 'text'
          ) THEN
              -- Safely convert TEXT to JSONB
              ALTER TABLE bookings ALTER COLUMN payment_details TYPE JSONB USING (
                  CASE 
                      WHEN payment_details IS NULL OR payment_details = '' THEN '{}'::jsonb
                      ELSE payment_details::jsonb
                  END
              );
          END IF;
          
          -- Ensure payment_details exists as JSONB if it doesn't exist at all
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'payment_details') THEN
              ALTER TABLE bookings ADD COLUMN payment_details JSONB DEFAULT '{}'::jsonb;
          END IF;

          -- Ensure other necessary columns for offline bookings exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'rental_amount') THEN
              ALTER TABLE bookings ADD COLUMN rental_amount DECIMAL(10,2);
          END IF;

          -- VEHICLES TABLE FIXES
          -- Add location_quantities if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'location_quantities') THEN
              ALTER TABLE vehicles ADD COLUMN location_quantities JSONB DEFAULT '{}'::jsonb;
          END IF;

          -- Add is_delivery_enabled if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'is_delivery_enabled') THEN
              ALTER TABLE vehicles ADD COLUMN is_delivery_enabled BOOLEAN DEFAULT false;
          END IF;

          -- Add delivery prices if they don't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'delivery_price_7_days') THEN
              ALTER TABLE vehicles ADD COLUMN delivery_price_7_days DECIMAL(10,2);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'delivery_price_15_days') THEN
              ALTER TABLE vehicles ADD COLUMN delivery_price_15_days DECIMAL(10,2);
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'delivery_price_30_days') THEN
              ALTER TABLE vehicles ADD COLUMN delivery_price_30_days DECIMAL(10,2);
          END IF;

          -- Add vehicle_category if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'vehicle_category') THEN
              ALTER TABLE vehicles ADD COLUMN vehicle_category TEXT;
          END IF;

          -- Add zero_deposit if it doesn't exist
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'zero_deposit') THEN
              ALTER TABLE vehicles ADD COLUMN zero_deposit BOOLEAN DEFAULT false;
          END IF;
      END $$;
    `);

        logger.info('Bookings table schema fix completed successfully');

        return NextResponse.json({
            success: true,
            message: 'Bookings table schema updated successfully'
        });
    } catch (error) {
        logger.error('Error fixing bookings table schema:', error);
        return NextResponse.json(
            { error: 'Failed to update bookings table schema', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
