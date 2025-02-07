-- Add payment_reference column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Add an index on payment_reference for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_payment_reference ON payments(payment_reference);

-- Add a unique constraint to prevent duplicate payment references
ALTER TABLE payments ADD CONSTRAINT uq_payments_payment_reference UNIQUE (payment_reference); 