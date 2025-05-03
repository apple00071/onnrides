-- Add pricing columns to vehicles table
ALTER TABLE vehicles 
  ADD COLUMN IF NOT EXISTS price_7_days NUMERIC,
  ADD COLUMN IF NOT EXISTS price_15_days NUMERIC,
  ADD COLUMN IF NOT EXISTS price_30_days NUMERIC,
  ADD COLUMN IF NOT EXISTS is_delivery_enabled BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS delivery_price_7_days NUMERIC,
  ADD COLUMN IF NOT EXISTS delivery_price_15_days NUMERIC,
  ADD COLUMN IF NOT EXISTS delivery_price_30_days NUMERIC; 