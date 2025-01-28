-- Add features column to vehicles table
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'vehicles' AND column_name = 'features'
    ) THEN
        ALTER TABLE vehicles ADD COLUMN features JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$; 