-- Add remaining columns needed for booking creation
DO $$
BEGIN
  -- Add booking_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'booking_type'
  ) THEN
    ALTER TABLE bookings 
    ADD COLUMN booking_type VARCHAR(20) DEFAULT 'online';
    
    COMMENT ON COLUMN bookings.booking_type IS 'Type of booking: online or offline';
  END IF;

  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE bookings 
    ADD COLUMN created_by VARCHAR(50);
    
    COMMENT ON COLUMN bookings.created_by IS 'User ID or system identifier that created the booking';
  END IF;

  -- Add notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'notes'
  ) THEN
    ALTER TABLE bookings 
    ADD COLUMN notes TEXT;
    
    COMMENT ON COLUMN bookings.notes IS 'Additional notes or comments about the booking';
  END IF;
END $$; 