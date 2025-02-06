-- First, add the column if it doesn't exist (as TEXT initially)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'payment_details'
    ) THEN
        ALTER TABLE bookings 
        ADD COLUMN payment_details TEXT;
    END IF;
END $$;

-- Convert existing TEXT data to valid JSON if any exists
UPDATE bookings 
SET payment_details = '{}' 
WHERE payment_details IS NULL OR payment_details = '';

-- Alter the column type to JSONB
ALTER TABLE bookings 
ALTER COLUMN payment_details TYPE JSONB 
USING COALESCE(payment_details::jsonb, '{}');

-- Set default value
ALTER TABLE bookings 
ALTER COLUMN payment_details 
SET DEFAULT '{}'::jsonb; 