-- Add price_per_hour column
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS price_per_hour DECIMAL(10,2);

-- Update price_per_hour from price_per_day (assuming price_per_day is daily rate for 12 hours)
UPDATE vehicles SET price_per_hour = ROUND(price_per_day / 12, 2) WHERE price_per_hour IS NULL;

-- Make price_per_hour NOT NULL after setting values
ALTER TABLE vehicles ALTER COLUMN price_per_hour SET NOT NULL;

-- Drop other pricing columns as they'll be calculated dynamically
ALTER TABLE vehicles DROP COLUMN IF EXISTS price_per_day;
ALTER TABLE vehicles DROP COLUMN IF EXISTS price_12hrs;
ALTER TABLE vehicles DROP COLUMN IF EXISTS price_24hrs;
ALTER TABLE vehicles DROP COLUMN IF EXISTS price_7days;
ALTER TABLE vehicles DROP COLUMN IF EXISTS price_15days;
ALTER TABLE vehicles DROP COLUMN IF EXISTS price_30days; 