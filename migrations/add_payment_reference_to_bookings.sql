-- Add payment_reference column to bookings table
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Add an index on payment_reference for faster lookups
CREATE INDEX IF NOT EXISTS idx_bookings_payment_reference ON bookings(payment_reference);

-- Update existing bookings to extract payment_reference from payment_details if available
UPDATE bookings 
SET payment_reference = CASE 
  WHEN payment_details IS NOT NULL AND jsonb_typeof(payment_details::jsonb) = 'object'
  THEN payment_details::jsonb->>'payment_reference'
  ELSE NULL
END
WHERE payment_details IS NOT NULL; 