-- Update vehicles table schema
DO $$ 
BEGIN
    -- Add vehicle_category column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'vehicle_category'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN vehicle_category TEXT DEFAULT 'normal' CHECK (vehicle_category IN ('normal', 'delivery', 'both'));
    END IF;

    -- Add is_delivery_enabled column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'is_delivery_enabled'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN is_delivery_enabled BOOLEAN DEFAULT false;
    END IF;

    -- Rename pricePerHour to price_per_hour if pricePerHour exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'pricePerHour'
    ) THEN
        ALTER TABLE vehicles RENAME COLUMN "pricePerHour" TO price_per_hour;
    END IF;

    -- Rename minBookingHours to min_booking_hours if minBookingHours exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'minBookingHours'
    ) THEN
        ALTER TABLE vehicles RENAME COLUMN "minBookingHours" TO min_booking_hours;
    END IF;

    -- Add price_per_hour column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'price_per_hour'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN price_per_hour DECIMAL(10,2);
    END IF;

    -- Add min_booking_hours column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'min_booking_hours'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN min_booking_hours INTEGER DEFAULT 1;
    END IF;

    -- Add other pricing columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'price_7_days'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN price_7_days DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'price_15_days'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN price_15_days DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'price_30_days'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN price_30_days DECIMAL(10,2);
    END IF;

    -- Add delivery pricing columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'delivery_price_7_days'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN delivery_price_7_days DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'delivery_price_15_days'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN delivery_price_15_days DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'delivery_price_30_days'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN delivery_price_30_days DECIMAL(10,2);
    END IF;
END $$; 