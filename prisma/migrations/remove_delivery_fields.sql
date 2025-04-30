-- Remove delivery_booking relation from bookings table
ALTER TABLE bookings DROP COLUMN IF EXISTS delivery_booking;

-- Drop delivery-related tables if they exist
DROP TABLE IF EXISTS delivery_bookings CASCADE;
DROP TABLE IF EXISTS delivery_tracking CASCADE;
DROP TABLE IF EXISTS delivery_partners CASCADE;

-- Remove delivery-related fields from users table
ALTER TABLE users 
DROP COLUMN IF EXISTS vehicle_type,
DROP COLUMN IF EXISTS vehicle_number,
DROP COLUMN IF EXISTS license_number; 