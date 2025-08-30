-- Add booking_type column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'online'; 