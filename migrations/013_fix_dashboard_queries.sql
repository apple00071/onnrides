-- Add missing columns to bookings table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'bookings'
        AND column_name = 'pickup_datetime'
    ) THEN
        ALTER TABLE bookings
        RENAME COLUMN start_date TO pickup_datetime;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'bookings'
        AND column_name = 'dropoff_datetime'
    ) THEN
        ALTER TABLE bookings
        RENAME COLUMN end_date TO dropoff_datetime;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'vehicles'
        AND column_name = 'price_per_day'
    ) THEN
        ALTER TABLE vehicles
        ADD COLUMN price_per_day DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'vehicles'
        AND column_name = 'status'
    ) THEN
        ALTER TABLE vehicles
        ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'active';
    END IF;
END $$; 