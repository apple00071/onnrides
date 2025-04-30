-- Add vehicle_category column to vehicles table
ALTER TABLE vehicles
ADD COLUMN vehicle_category VARCHAR(10) DEFAULT 'normal' NOT NULL;

-- Create an index for better query performance
CREATE INDEX idx_vehicle_category ON vehicles(vehicle_category);

-- Add check constraint to ensure valid values
ALTER TABLE vehicles
ADD CONSTRAINT chk_vehicle_category 
CHECK (vehicle_category IN ('normal', 'delivery', 'both')); 