-- Rename start_date to start_time if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bookings' AND column_name = 'start_date') THEN
        ALTER TABLE bookings RENAME COLUMN start_date TO start_time;
    ELSE
        ALTER TABLE bookings ADD COLUMN start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$;

-- Rename end_date to end_time if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'bookings' AND column_name = 'end_date') THEN
        ALTER TABLE bookings RENAME COLUMN end_date TO end_time;
    ELSE
        ALTER TABLE bookings ADD COLUMN end_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;
END $$; 