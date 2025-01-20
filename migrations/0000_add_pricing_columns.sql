DO $$ BEGIN
    -- Add pricing columns
    ALTER TABLE vehicles
    ADD COLUMN IF NOT EXISTS price_12hrs INTEGER,
    ADD COLUMN IF NOT EXISTS price_24hrs INTEGER,
    ADD COLUMN IF NOT EXISTS price_7days INTEGER,
    ADD COLUMN IF NOT EXISTS price_15days INTEGER,
    ADD COLUMN IF NOT EXISTS price_30days INTEGER;
    
    -- Set default values for existing records
    UPDATE vehicles
    SET 
        price_12hrs = price_per_day / 2,
        price_24hrs = price_per_day,
        price_7days = price_per_day * 7,
        price_15days = price_per_day * 15,
        price_30days = price_per_day * 30;
END $$; 