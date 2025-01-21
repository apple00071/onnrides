-- Add status column with enum constraint
DO $$ BEGIN
    CREATE TYPE vehicle_status AS ENUM ('active', 'maintenance', 'retired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add missing columns
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status vehicle_status NOT NULL DEFAULT 'active';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP; 