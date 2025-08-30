-- Add booking_type and security_deposit columns
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS booking_type VARCHAR(20) DEFAULT 'online',
ADD COLUMN IF NOT EXISTS security_deposit DECIMAL(10,2) DEFAULT 0; 