-- Add is_blocked column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT false;

-- Update existing users to have is_blocked set to false
UPDATE users SET is_blocked = false WHERE is_blocked IS NULL; 