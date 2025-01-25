-- First, let's check what columns actually exist in the bookings table
DO $$ 
DECLARE
    column_exists boolean;
BEGIN
    -- Check if start_date exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'start_date'
    ) INTO column_exists;
    
    IF column_exists THEN
        -- If start_date exists, rename it to pickup_datetime
        EXECUTE 'ALTER TABLE bookings RENAME COLUMN start_date TO pickup_datetime';
    END IF;

    -- Check if end_date exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'end_date'
    ) INTO column_exists;
    
    IF column_exists THEN
        -- If end_date exists, rename it to dropoff_datetime
        EXECUTE 'ALTER TABLE bookings RENAME COLUMN end_date TO dropoff_datetime';
    END IF;

    -- Check if amount exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'amount'
    ) INTO column_exists;
    
    IF column_exists THEN
        -- If amount exists, rename it to total_amount
        EXECUTE 'ALTER TABLE bookings RENAME COLUMN amount TO total_amount';
    END IF;

    -- Add any missing columns
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'pickup_datetime'
    ) THEN
        EXECUTE 'ALTER TABLE bookings ADD COLUMN pickup_datetime TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'dropoff_datetime'
    ) THEN
        EXECUTE 'ALTER TABLE bookings ADD COLUMN dropoff_datetime TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP';
    END IF;

    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' AND column_name = 'total_amount'
    ) THEN
        EXECUTE 'ALTER TABLE bookings ADD COLUMN total_amount DECIMAL(10,2) NOT NULL DEFAULT 0';
    END IF;
END $$; 