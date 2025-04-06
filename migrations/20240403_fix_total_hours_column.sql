-- Make total_hours column nullable in bookings table
DO $$
BEGIN
  -- Check if total_hours column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    AND column_name = 'total_hours'
  ) THEN
    -- Make the column nullable
    ALTER TABLE bookings 
    ALTER COLUMN total_hours DROP NOT NULL;
    
    RAISE NOTICE 'Modified total_hours column to be nullable';
  ELSE
    RAISE NOTICE 'total_hours column not found';
  END IF;
END $$; 