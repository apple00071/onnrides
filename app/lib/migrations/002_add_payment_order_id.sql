-- Add payment_order_id column to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS payment_order_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_payment_order_id ON bookings(payment_order_id); 