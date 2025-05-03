-- Rename price column to ensure consistency
DO $$ 
BEGIN
    -- First check if pricePerHour exists and price_per_hour doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'pricePerHour'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'price_per_hour'
    ) THEN
        ALTER TABLE vehicles RENAME COLUMN "pricePerHour" TO price_per_hour;
    -- If price_per_hour exists and pricePerHour doesn't, we're good
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'vehicles' AND column_name = 'price_per_hour'
    ) THEN
        -- Column is already correct, do nothing
        NULL;
    -- If neither exists, create price_per_hour
    ELSE
        ALTER TABLE vehicles ADD COLUMN price_per_hour DECIMAL(10,2);
    END IF;
END $$; 