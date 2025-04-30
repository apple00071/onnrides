-- Add vehicle category and delivery pricing columns
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS vehicle_category VARCHAR(10) DEFAULT 'normal';

-- Add delivery pricing columns
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS delivery_price_7_days REAL,
ADD COLUMN IF NOT EXISTS delivery_price_15_days REAL,
ADD COLUMN IF NOT EXISTS delivery_price_30_days REAL;

-- Update existing vehicles to have normal category
UPDATE vehicles SET vehicle_category = 'normal' WHERE vehicle_category IS NULL;

-- Make vehicle_category NOT NULL after setting default values
ALTER TABLE vehicles 
ALTER COLUMN vehicle_category SET NOT NULL;

-- Add constraint to ensure valid categories
ALTER TABLE vehicles 
DROP CONSTRAINT IF EXISTS chk_vehicle_category;

ALTER TABLE vehicles 
ADD CONSTRAINT chk_vehicle_category 
CHECK (vehicle_category IN ('normal', 'delivery', 'both'));

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicle_category ON vehicles(vehicle_category);
CREATE INDEX IF NOT EXISTS idx_vehicle_delivery_price_7_days ON vehicles(delivery_price_7_days);
CREATE INDEX IF NOT EXISTS idx_vehicle_delivery_price_15_days ON vehicles(delivery_price_15_days);
CREATE INDEX IF NOT EXISTS idx_vehicle_delivery_price_30_days ON vehicles(delivery_price_30_days); 