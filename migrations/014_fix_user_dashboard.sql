-- Rename amount column to total_amount if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'bookings'
        AND column_name = 'amount'
    ) THEN
        ALTER TABLE bookings
        RENAME COLUMN amount TO total_amount;
    END IF;

    -- Add total_amount column if neither exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'bookings'
        AND column_name = 'total_amount'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'bookings'
        AND column_name = 'amount'
    ) THEN
        ALTER TABLE bookings
        ADD COLUMN total_amount DECIMAL(10,2) NOT NULL DEFAULT 0;
    END IF;
END $$; 