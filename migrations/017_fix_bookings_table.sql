-- Add start_date and end_date columns to bookings table
ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE;

-- Update existing records to have default values if any exist
UPDATE bookings 
SET start_date = created_at,
    end_date = created_at + INTERVAL '1 day'
WHERE start_date IS NULL; 