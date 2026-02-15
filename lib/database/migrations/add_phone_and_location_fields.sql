-- Add phone column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- Add location columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS pickup_location TEXT,
ADD COLUMN IF NOT EXISTS dropoff_location TEXT; 