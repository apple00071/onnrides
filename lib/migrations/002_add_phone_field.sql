-- Add phone field to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT; 