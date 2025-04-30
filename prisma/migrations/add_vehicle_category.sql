-- Add vehicle category column
ALTER TABLE vehicles
ADD COLUMN vehicle_category VARCHAR(10) DEFAULT 'normal';

-- Create index for vehicle category
CREATE INDEX idx_vehicle_category ON vehicles(vehicle_category);

-- Add check constraint to ensure valid categories
ALTER TABLE vehicles
ADD CONSTRAINT check_vehicle_category 
CHECK (vehicle_category IN ('normal', 'delivery', 'both')); 