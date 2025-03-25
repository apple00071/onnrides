-- Fix booking IDs migration
DO $$ 
BEGIN
    -- First ensure booking_id column exists and has correct type
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'booking_id'
    ) THEN
        ALTER TABLE bookings 
        ADD COLUMN booking_id VARCHAR(5);
    END IF;

    -- Create temporary column for display_id if it exists
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'display_id'
    ) THEN
        -- Copy display_id values to booking_id where booking_id is null
        UPDATE bookings 
        SET booking_id = display_id 
        WHERE booking_id IS NULL 
        AND display_id IS NOT NULL;

        -- Drop display_id column as we'll use booking_id consistently
        ALTER TABLE bookings 
        DROP COLUMN display_id;
    END IF;

    -- Update any remaining null booking_ids with new OR### format
    WITH RECURSIVE booking_numbers AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
        FROM bookings 
        WHERE booking_id IS NULL
    )
    UPDATE bookings b
    SET booking_id = 'OR' || LPAD(bn.rn::text, 3, '0')
    FROM booking_numbers bn
    WHERE b.id = bn.id;

    -- Make booking_id NOT NULL and UNIQUE
    ALTER TABLE bookings 
    ALTER COLUMN booking_id SET NOT NULL;

    ALTER TABLE bookings 
    ADD CONSTRAINT unique_booking_id UNIQUE (booking_id);

    -- Create index for faster lookups
    CREATE INDEX IF NOT EXISTS idx_bookings_booking_id 
    ON bookings(booking_id);
END $$; 