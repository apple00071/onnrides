-- First, get the current type of pricePerHour column
DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type
    FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'pricePerHour';

    -- Alter price_per_hour to match pricePerHour type
    IF col_type = 'double precision' THEN
        ALTER TABLE vehicles 
        ALTER COLUMN price_per_hour TYPE double precision 
        USING price_per_hour::double precision;
    ELSIF col_type = 'numeric' THEN
        -- Just in case pricePerHour is numeric, update both to be consistent
        ALTER TABLE vehicles 
        ALTER COLUMN price_per_hour TYPE numeric 
        USING price_per_hour::numeric;
        
        ALTER TABLE vehicles 
        ALTER COLUMN "pricePerHour" TYPE numeric 
        USING "pricePerHour"::numeric;
    END IF;
END
$$; 