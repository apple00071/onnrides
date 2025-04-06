-- Add 'initiated' to bookings status enum type if using enum
DO $$
BEGIN
  -- Check if the table uses an enum type for status
  IF EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'booking_status'
  ) THEN
    -- Add 'initiated' to the enum if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e 
      JOIN pg_type t ON e.enumtypid = t.oid 
      WHERE t.typname = 'booking_status' AND e.enumlabel = 'initiated'
    ) THEN
      ALTER TYPE booking_status ADD VALUE 'initiated' AFTER 'confirmed';
    END IF;
  ELSE
    -- If not using enum, we assume the column uses a CHECK constraint
    -- First, check if the table has a CHECK constraint
    IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname LIKE 'bookings_status_check%'
    ) THEN
      -- Modify the existing CHECK constraint
      ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
      ALTER TABLE bookings ADD CONSTRAINT bookings_status_check 
        CHECK (status IN ('pending', 'confirmed', 'initiated', 'completed', 'cancelled'));
    END IF;
  END IF;
END $$; 