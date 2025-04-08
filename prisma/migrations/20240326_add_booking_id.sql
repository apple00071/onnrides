-- Add booking_id column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS booking_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);

-- Create a temporary table to store the generated booking IDs
CREATE TEMP TABLE temp_booking_ids AS
SELECT id, 'OR' || LPAD(CAST(ROW_NUMBER() OVER (ORDER BY created_at) AS TEXT), 3, '0') as new_booking_id
FROM bookings
WHERE booking_id IS NULL;

-- Update existing bookings with the generated booking IDs
UPDATE bookings b
SET booking_id = t.new_booking_id
FROM temp_booking_ids t
WHERE b.id = t.id;

-- Drop the temporary table
DROP TABLE temp_booking_ids; 