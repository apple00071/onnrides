-- Add booking_type column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'online';

-- Update existing bookings to have booking_type set to 'online'
UPDATE bookings SET booking_type = 'online' WHERE booking_type IS NULL; 