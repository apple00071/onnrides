-- Add payment_method column to bookings table
DO $$
BEGIN
  -- Check if payment_method column already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'payment_method'
  ) THEN
    -- Add payment_method column
    ALTER TABLE bookings 
    ADD COLUMN payment_method VARCHAR(20);
    
    -- Add comment for documentation
    COMMENT ON COLUMN bookings.payment_method IS 'Payment method used (cash, upi, card, online)';
  END IF;
END $$; 