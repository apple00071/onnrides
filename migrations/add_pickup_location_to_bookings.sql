-- Add pickup_location column to bookings table
ALTER TABLE bookings
ADD COLUMN pickup_location VARCHAR(255) NOT NULL;

-- Update existing bookings to use the first location from the vehicle's location array
UPDATE bookings b
SET pickup_location = (
  SELECT (v.location::jsonb->0)::text
  FROM vehicles v
  WHERE v.id = b.vehicle_id
)
WHERE b.pickup_location IS NULL; 