-- First, get the current type of minBookingHours column
DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'minBookingHours';

    -- Alter min_booking_hours to match minBookingHours type
    IF col_type = 'integer' THEN
        ALTER TABLE vehicles 
        ALTER COLUMN min_booking_hours TYPE integer 
        USING min_booking_hours::integer;
    ELSIF col_type = 'numeric' THEN
        ALTER TABLE vehicles 
        ALTER COLUMN min_booking_hours TYPE numeric 
        USING min_booking_hours::numeric;
        
        ALTER TABLE vehicles 
        ALTER COLUMN "minBookingHours" TYPE numeric 
        USING "minBookingHours"::numeric;
    ELSIF col_type = 'double precision' THEN
        ALTER TABLE vehicles 
        ALTER COLUMN min_booking_hours TYPE double precision 
        USING min_booking_hours::double precision;
        
        ALTER TABLE vehicles 
        ALTER COLUMN "minBookingHours" TYPE double precision 
        USING "minBookingHours"::double precision;
    END IF;
END
$$; 