-- Add new pricing columns to vehicles table
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS price_7_days REAL,
ADD COLUMN IF NOT EXISTS price_15_days REAL,
ADD COLUMN IF NOT EXISTS price_30_days REAL; 