-- Add vehicle category and delivery pricing columns
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS vehicle_category VARCHAR(10) DEFAULT 'normal' NOT NULL,
ADD COLUMN IF NOT EXISTS delivery_price_7_days REAL,
ADD COLUMN IF NOT EXISTS delivery_price_15_days REAL,
ADD COLUMN IF NOT EXISTS delivery_price_30_days REAL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vehicle_category ON vehicles(vehicle_category);
CREATE INDEX IF NOT EXISTS idx_vehicle_delivery_price_7_days ON vehicles(delivery_price_7_days);
CREATE INDEX IF NOT EXISTS idx_vehicle_delivery_price_15_days ON vehicles(delivery_price_15_days);
CREATE INDEX IF NOT EXISTS idx_vehicle_delivery_price_30_days ON vehicles(delivery_price_30_days);

-- Add check constraint to ensure valid categories
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'chk_vehicle_category'
    ) THEN
        ALTER TABLE vehicles
        ADD CONSTRAINT chk_vehicle_category 
        CHECK (vehicle_category IN ('normal', 'delivery', 'both'));
    END IF;
END $$; 