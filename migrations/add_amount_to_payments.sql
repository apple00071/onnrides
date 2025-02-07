-- First ensure the amount column exists with correct type
DO $$ 
BEGIN
    -- Add amount column if it doesn't exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'payments' AND column_name = 'amount'
    ) THEN
        ALTER TABLE payments ADD COLUMN amount DECIMAL(10,2);
    END IF;

    -- Update any existing NULL values to 0
    UPDATE payments SET amount = 0 WHERE amount IS NULL;

    -- Then make it NOT NULL
    ALTER TABLE payments ALTER COLUMN amount SET NOT NULL;
END $$; 