-- Add is_available column
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_available BOOLEAN NOT NULL DEFAULT true; 