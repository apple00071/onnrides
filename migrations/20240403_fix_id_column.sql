-- Fix ID column in bookings table to use UUID generation
DO $$
BEGIN
  -- First ensure the uuid-ossp extension is available
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  
  -- Get information about the id column
  DECLARE
    column_data RECORD;
  BEGIN
    SELECT data_type, column_default 
    INTO column_data
    FROM information_schema.columns 
    WHERE table_name = 'bookings' AND column_name = 'id';
    
    -- If the column exists and has no default value, set the default
    IF column_data.column_default IS NULL THEN
      -- Set default value for id column to use uuid_generate_v4()
      ALTER TABLE bookings 
      ALTER COLUMN id SET DEFAULT uuid_generate_v4();
      
      RAISE NOTICE 'Set default value for id column to uuid_generate_v4()';
    ELSE
      RAISE NOTICE 'id column already has default value: %', column_data.column_default;
    END IF;
  END;
END $$; 