-- Add pricing columns to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS price_12hrs DECIMAL(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS price_24hrs DECIMAL(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS price_7days DECIMAL(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS price_15days DECIMAL(10,2);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS price_30days DECIMAL(10,2); 