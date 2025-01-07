DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'vehicles'
        AND column_name = 'is_available'
    ) THEN
        ALTER TABLE vehicles
        ADD COLUMN is_available BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Update existing vehicles to be available by default
UPDATE vehicles
SET is_available = true
WHERE is_available IS NULL; 