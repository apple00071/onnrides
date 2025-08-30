-- Add security_deposit column to bookings table
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10,2) DEFAULT 0; 