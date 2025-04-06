-- Add payment_reference column to bookings table
DO $$
BEGIN
  -- Check if payment_reference column already exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'payment_reference'
  ) THEN
    -- Add payment_reference column
    ALTER TABLE bookings 
    ADD COLUMN payment_reference VARCHAR(100);
    
    -- Add comment for documentation
    COMMENT ON COLUMN bookings.payment_reference IS 'Reference ID from payment provider or receipt number for offline payments';
  END IF;
END $$; 