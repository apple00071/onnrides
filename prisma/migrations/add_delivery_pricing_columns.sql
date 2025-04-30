-- Add delivery pricing columns to vehicles table
ALTER TABLE vehicles
ADD COLUMN delivery_price_7_days REAL,
ADD COLUMN delivery_price_15_days REAL,
ADD COLUMN delivery_price_30_days REAL;

-- Create indexes for better query performance
CREATE INDEX idx_vehicle_delivery_price_7_days ON vehicles(delivery_price_7_days);
CREATE INDEX idx_vehicle_delivery_price_15_days ON vehicles(delivery_price_15_days);
CREATE INDEX idx_vehicle_delivery_price_30_days ON vehicles(delivery_price_30_days); 