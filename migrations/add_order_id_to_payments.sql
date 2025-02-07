-- Add order_id column to payments table
ALTER TABLE payments ADD COLUMN IF NOT EXISTS order_id TEXT;

-- Add an index on order_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON payments(order_id);

-- Add a unique constraint to prevent duplicate order IDs
ALTER TABLE payments ADD CONSTRAINT uq_payments_order_id UNIQUE (order_id); 