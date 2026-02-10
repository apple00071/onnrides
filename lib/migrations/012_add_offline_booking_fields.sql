-- Add offline booking fields to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_id TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_type TEXT DEFAULT 'online' CHECK (booking_type IN ('online', 'offline'));
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS rental_amount DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS security_deposit_amount DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(10,2)DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pending_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Customer information fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS alternate_phone TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS aadhar_number TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS father_number TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS mother_number TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dl_number TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dl_expiry_date DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS permanent_address TEXT;

-- Vehicle and document fields
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS dl_scan TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS aadhar_scan TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS selfie TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false;

-- Create index on booking_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_booking_id ON bookings(booking_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_type ON bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_bookings_phone_number ON bookings(phone_number);
