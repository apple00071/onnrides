-- Add booking_id column
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_id VARCHAR(5) UNIQUE;

-- Update existing bookings with generated booking IDs
UPDATE bookings 
SET booking_id = 'OR' || SUBSTRING(MD5(RANDOM()::text) FROM 1 FOR 3)
WHERE booking_id IS NULL;

-- Make booking_id NOT NULL after updating existing records
ALTER TABLE bookings ALTER COLUMN booking_id SET NOT NULL; 