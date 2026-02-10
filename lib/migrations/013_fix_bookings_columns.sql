-- Migration to add missing columns and fix types for bookings table
DO $$ 
BEGIN 
    -- Add pickup_location if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'pickup_location') THEN
        ALTER TABLE bookings ADD COLUMN pickup_location TEXT;
    END IF;

    -- Add dropoff_location if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'dropoff_location') THEN
        ALTER TABLE bookings ADD COLUMN dropoff_location TEXT;
    END IF;

    -- Fix payment_details type to JSONB if it's currently TEXT
    -- We'll use a temporary column to migrate data safely if needed
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
END $$;
