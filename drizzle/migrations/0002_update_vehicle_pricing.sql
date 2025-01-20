-- Update vehicles table to use hourly pricing
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS price_per_hour DECIMAL(10,2);

-- Copy data from price_12hrs to price_per_hour (divided by 12 to get hourly rate)
UPDATE vehicles
SET price_per_hour = price_12hrs / 12
WHERE price_12hrs IS NOT NULL;

-- Make price_per_hour NOT NULL after data migration
ALTER TABLE vehicles
ALTER COLUMN price_per_hour SET NOT NULL;

-- Drop old pricing columns
ALTER TABLE vehicles
DROP COLUMN IF EXISTS price_12hrs,
DROP COLUMN IF EXISTS price_24hrs,
DROP COLUMN IF EXISTS price_per_day,
DROP COLUMN IF EXISTS price_7days,
DROP COLUMN IF EXISTS price_15days,
DROP COLUMN IF EXISTS price_30days; 