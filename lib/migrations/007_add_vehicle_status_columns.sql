-- Add status and availability columns to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'; 